import { NextResponse } from 'next/server';
import { getAllPendingTodos } from '@/lib/notes';

export async function GET() {
  const todos = getAllPendingTodos();
  const grouped: Record<string, typeof todos> = {};
  for (const todo of todos) {
    if (!grouped[todo.entryTopic]) grouped[todo.entryTopic] = [];
    grouped[todo.entryTopic].push(todo);
  }
  return NextResponse.json({ todos, grouped, total: todos.length });
}
