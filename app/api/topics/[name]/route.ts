import { NextRequest, NextResponse } from 'next/server';
import { getTopics, updateTopic, deleteTopic, getEntriesByTopic } from '@/lib/notes';

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const topicName = decodeURIComponent(name);
  const topic = getTopics().find((t) => t.name === topicName);
  if (!topic) return NextResponse.json({ error: '主题不存在' }, { status: 404 });
  const entries = getEntriesByTopic(topicName);
  return NextResponse.json({ ...topic, entries });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const topicName = decodeURIComponent(name);
  const body = await req.json();
  try {
    const updated = updateTopic(topicName, { description: body.description });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  deleteTopic(decodeURIComponent(name));
  return NextResponse.json({ ok: true });
}
