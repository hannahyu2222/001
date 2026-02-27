import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { batchAnalyzeBearNotes, hasApiKey } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { folderPath, existingTopics } = await req.json();
  if (!folderPath?.trim()) return NextResponse.json({ error: '请提供文件夹路径' }, { status: 400 });

  const resolved = path.resolve(folderPath.trim());
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: `路径不存在: ${resolved}` }, { status: 404 });
  }

  const files = fs.readdirSync(resolved).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    return NextResponse.json({ error: '该文件夹中没有 .md 文件' }, { status: 400 });
  }

  const notes = files.map((filename) => {
    const raw = fs.readFileSync(path.join(resolved, filename), 'utf-8');
    const { content } = matter(raw);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename.replace('.md', '');
    const cleanBody = content.replace(/^#.+$/m, '').trim();
    const knowledgeLines = cleanBody
      .split('\n')
      .filter((l: string) => /^[-*]\s/.test(l))
      .map((l: string) => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 10);

    return {
      filename,
      title,
      content: content.slice(0, 800),
      knowledge: knowledgeLines,
      reflection: knowledgeLines.length === 0 ? cleanBody.slice(0, 300) : '',
    };
  });

  if (!hasApiKey()) {
    // No AI: build basic analyses from file content
    const analyses = notes.map((n) => ({
      originalTitle: n.title,
      suggestedTopic: '未分类',
      knowledge: n.knowledge.length > 0 ? n.knowledge : [n.content.slice(0, 100)],
      actions: [],
      reflection: n.reflection,
    }));
    return NextResponse.json({ analyses, hasAI: false });
  }

  // AI batch analysis
  const analysisNotes = notes.slice(0, 20).map(({ title, content }) => ({ title, content }));
  const result = await batchAnalyzeBearNotes(analysisNotes, existingTopics || []);

  if (!result) {
    // Fallback
    const analyses = notes.slice(0, 20).map((n) => ({
      originalTitle: n.title,
      suggestedTopic: '未分类',
      knowledge: n.knowledge.length > 0 ? n.knowledge : [n.content.slice(0, 100)],
      actions: [] as string[],
      reflection: n.reflection,
    }));
    return NextResponse.json({ analyses, hasAI: true });
  }

  return NextResponse.json({ analyses: result, hasAI: true });
}
