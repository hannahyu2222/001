#!/usr/bin/env node
// 碎碎念日记 · 及时反馈 (MVP)
// 盯着一个 Markdown 文件夹，你一停笔，就在这段话下面自动追加 AI 的「洞察」反馈。
// 零依赖，只需 Node 18+ 和一个 ANTHROPIC_API_KEY。
//
//   node scripts/diary.mjs
//
// 可选环境变量：
//   ANTHROPIC_API_KEY  必填
//   DIARY_DIR          监听的文件夹，默认 ./diary
//   DIARY_MODEL        模型，默认 claude-sonnet-4-6（快，适合及时反馈）
//   DIARY_POLL_MS      轮询间隔，默认 1500ms
//   DIARY_STABLE_MS    停笔多久算「写完」，默认 3500ms

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ---- 极简 .env 加载（不覆盖已有环境变量）----
(function loadEnv() {
  const f = path.resolve('.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

const DIARY_DIR = path.resolve(process.env.DIARY_DIR || 'diary');
const MODEL = process.env.DIARY_MODEL || 'claude-sonnet-4-6';
const POLL_MS = Number(process.env.DIARY_POLL_MS || 1500);
const STABLE_MS = Number(process.env.DIARY_STABLE_MS || 3500);
const CONTEXT_CHARS = 4000;
const MIN_CHARS = 2;

const AI_OPEN = '<!-- ai -->';
const AI_CLOSE = '<!-- /ai -->';

const API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
if (!API_KEY) {
  console.error('✗ 没找到 ANTHROPIC_API_KEY。请在 .env 里写一行：ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const SYSTEM_PROMPT = `你是一个善于洞察的日记伙伴。用户在写「碎碎念」——零散的想法和情绪。
你的任务不是安慰、不是给一堆建议，而是像一面镜子，帮 ta 看见这段话背后的东西。

每次回应：
- 用中文，简短（2-4 句，控制在 120 字以内）
- 提炼这段话里真正的情绪、反复出现的模式、或核心要点
- 如果结合「之前的记录」能看出主题、变化或矛盾，点出来
- 具体、贴着 ta 的原话，不要泛泛而谈，不要鸡汤套话
- 不要用「你应该」，不要罗列建议，不要复述原文
只输出洞察本身，不带任何标题或前缀。`;

// ---- 工具函数 ----
function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
    .map((f) => path.join(dir, f));
}

// 返回最后一个 AI 反馈块之后的「新内容」
function trailingChunk(content) {
  const idx = content.lastIndexOf(AI_CLOSE);
  const after = idx === -1 ? content : content.slice(idx + AI_CLOSE.length);
  return after;
}

function buildContext(content) {
  const idx = content.lastIndexOf(AI_CLOSE);
  const before = idx === -1 ? '' : content.slice(0, idx + AI_CLOSE.length);
  const trimmed = before.trim();
  if (!trimmed) return '（无）';
  return trimmed.length > CONTEXT_CHARS ? '…' + trimmed.slice(-CONTEXT_CHARS) : trimmed;
}

function formatBlock(body) {
  const time = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const quoted = body
    .trim()
    .split('\n')
    .map((l) => (l.trim() ? `> ${l.trim()}` : '>'))
    .join('\n');
  return `\n\n${AI_OPEN}\n> 🪞 **洞察** · ${time}\n>\n${quoted}\n${AI_CLOSE}\n`;
}

async function askClaude(chunk, context) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `之前的记录（仅供你看出模式，不要复述）：\n${context}\n\n———\n\nta 刚写下的：\n${chunk.trim()}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return text;
}

// ---- 监听状态 ----
// 每个文件： { prev, changedAt, respondedChunk, busy }
const state = new Map();
// 启动前就存在的文件 → 只对「之后写的」反馈；启动后新建的文件 → 全程反馈
let startupFiles = new Set();

async function tick() {
  const files = listMdFiles(DIARY_DIR);
  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    let st = state.get(file);
    if (!st) {
      // 启动前就有的文件，把现有末尾当基线（不翻旧账）；新建的文件则全程反馈
      const baseline = startupFiles.has(file) ? trailingChunk(content) : '';
      st = { prev: content, changedAt: Date.now(), respondedChunk: baseline, busy: false };
      state.set(file, st);
      continue;
    }

    if (content !== st.prev) {
      st.prev = content;
      st.changedAt = Date.now();
      continue; // 还在写，等稳定
    }

    if (st.busy) continue;

    const chunk = trailingChunk(content);
    if (chunk.trim().length < MIN_CHARS) continue;
    if (chunk === st.respondedChunk) continue;
    if (Date.now() - st.changedAt < STABLE_MS) continue;

    // 稳定了，且有新内容 → 生成反馈
    st.busy = true;
    const name = path.basename(file);
    const preview = chunk.trim().replace(/\s+/g, ' ').slice(0, 30);
    console.log(`\n💭 [${name}] 收到：「${preview}${preview.length >= 30 ? '…' : ''}」 思考中…`);

    try {
      const context = buildContext(content);
      const body = await askClaude(chunk, context);
      if (!body) throw new Error('空回复');

      // 写之前再读一次，确认这段时间用户没继续敲
      const fresh = fs.readFileSync(file, 'utf-8');
      if (fresh !== content) {
        console.log('   ↪ 你还在写，先不打扰，等下一轮。');
        st.busy = false;
        continue;
      }

      const next = content.replace(/\s*$/, '') + formatBlock(body);
      fs.writeFileSync(file, next, 'utf-8');

      st.prev = next;
      st.changedAt = Date.now();
      st.respondedChunk = trailingChunk(next); // 现在末尾是空的
      console.log(`   ✓ 已回应 → ${name}`);
    } catch (e) {
      console.error(`   ✗ 出错：${e.message}`);
      // 不更新 respondedChunk，下一轮会重试
    } finally {
      st.busy = false;
    }
  }
}

// ---- 启动 ----
if (!fs.existsSync(DIARY_DIR)) fs.mkdirSync(DIARY_DIR, { recursive: true });
startupFiles = new Set(listMdFiles(DIARY_DIR));

console.log('🪞 碎碎念日记 · 及时反馈');
console.log(`   监听：${DIARY_DIR}`);
console.log(`   模型：${MODEL}`);
console.log('   随便打开（或新建）里面的 .md 文件开始写，停笔几秒就有回应。Ctrl+C 退出。\n');

setInterval(() => {
  tick().catch((e) => console.error('tick error:', e));
}, POLL_MS);
