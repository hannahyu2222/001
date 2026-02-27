import { NextRequest, NextResponse } from 'next/server';
import { getTopics, createTopic, getTopicStats } from '@/lib/notes';

export async function GET() {
  const topics = getTopics();
  const result = topics.map((t) => ({ ...t, stats: getTopicStats(t.name) }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: '主题名称不能为空' }, { status: 400 });
  try {
    const topic = createTopic({ name: name.trim(), description: description?.trim() || '', createdAt: new Date().toISOString() });
    return NextResponse.json(topic, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
