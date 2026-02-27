import { NextRequest, NextResponse } from 'next/server';
import { getEntry, updateEntry, deleteEntry, toggleTodo } from '@/lib/notes';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) return NextResponse.json({ error: '条目不存在' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    if (body.todoToggle !== undefined || 'todoToggle' in body) {
      const entry = toggleTodo(id, typeof body.todoIndex === 'number' ? body.todoIndex : body.todoToggle);
      return NextResponse.json(entry);
    }
    const entry = updateEntry(id, body);
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
