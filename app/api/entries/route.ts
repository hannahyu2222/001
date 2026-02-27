import { NextRequest, NextResponse } from 'next/server';
import { getAllEntries, searchEntries, createEntry, getTopics, createTopic } from '@/lib/notes';
import { suggestTopic, hasApiKey } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('search');
  const topic = req.nextUrl.searchParams.get('topic');
  let entries = q ? searchEntries(q) : getAllEntries();
  if (topic) entries = entries.filter((e) => e.topic === topic);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic, source_url, source_title, knowledge, actions, reflection, autoClassify } = body;

  if ((!knowledge || knowledge.length === 0) && !reflection) {
    return NextResponse.json({ error: '至少填写知识点或感悟' }, { status: 400 });
  }

  let finalTopic = topic?.trim() || '';

  // AI suggest topic if not provided
  if (!finalTopic && autoClassify && hasApiKey()) {
    const topicNames = getTopics().map((t) => t.name);
    const contentStr = [...(knowledge || []), reflection || ''].join('\n');
    const suggested = await suggestTopic(contentStr, topicNames);
    if (suggested) {
      finalTopic = suggested;
      // Create topic if new
      if (!topicNames.includes(finalTopic)) {
        try { createTopic({ name: finalTopic, description: '', createdAt: new Date().toISOString() }); } catch { /* exists */ }
      }
    }
  }

  if (!finalTopic) finalTopic = '未分类';

  const entry = createEntry({
    topic: finalTopic,
    source_url: source_url || '',
    source_title: source_title || '',
    knowledge: knowledge || [],
    actions: (actions || []).map((a: string) => a.startsWith('[ ]') || a.startsWith('[x]') ? a : `[ ] ${a}`),
    reflection: reflection || '',
  });

  return NextResponse.json(entry, { status: 201 });
}
