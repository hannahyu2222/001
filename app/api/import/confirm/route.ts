import { NextRequest, NextResponse } from 'next/server';
import { createEntry, createTopic, getTopics } from '@/lib/notes';

interface BearNoteAnalysis {
  originalTitle: string;
  suggestedTopic: string;
  knowledge: string[];
  actions: string[];
  reflection: string;
}

export async function POST(req: NextRequest) {
  const { entries }: { entries: BearNoteAnalysis[] } = await req.json();

  if (!entries?.length) {
    return NextResponse.json({ error: '没有要导入的条目' }, { status: 400 });
  }

  const existingTopicNames = getTopics().map((t) => t.name);
  let imported = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const topicName = entry.suggestedTopic?.trim() || '未分类';

    // Create topic if not exists
    if (!existingTopicNames.includes(topicName)) {
      try {
        createTopic({ name: topicName, description: '', createdAt: new Date().toISOString() });
        existingTopicNames.push(topicName);
      } catch { /* may already exist */ }
    }

    try {
      createEntry({
        topic: topicName,
        source_url: '',
        source_title: entry.originalTitle,
        knowledge: entry.knowledge || [],
        actions: (entry.actions || []).map((a: string) =>
          a.startsWith('[ ]') || a.startsWith('[x]') ? a : `[ ] ${a}`
        ),
        reflection: entry.reflection || '',
      });
      imported++;
    } catch (e) {
      errors.push(`${entry.originalTitle}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ count: imported, errors });
}
