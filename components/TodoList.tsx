'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PendingTodo {
  entryId: string;
  entryTopic: string;
  entryTitle?: string;
  todoIndex: number;
  todoText: string;
}

interface Props {
  grouped: Record<string, PendingTodo[]>;
}

export default function TodoList({ grouped }: Props) {
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (todo: PendingTodo) => {
    const key = `${todo.entryId}-${todo.todoIndex}`;
    setToggling(key);
    try {
      const res = await fetch(`/api/entries/${todo.entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoToggle: todo.todoIndex }),
      });
      if (res.ok) {
        setCompletedKeys((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {Object.entries(grouped).map(([topic, todos]) => (
        <div key={topic} className="card">
          <div style={{ marginBottom: '12px' }}>
            <Link
              href={`/topic/${encodeURIComponent(topic)}`}
              style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}
            >
              {topic}
            </Link>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              {todos.length} 个待办
            </span>
          </div>
          {todos.map((todo) => {
            const key = `${todo.entryId}-${todo.todoIndex}`;
            const isDone = completedKeys.has(key);
            return (
              <div key={key} className="todo-item">
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={isDone}
                  disabled={toggling === key}
                  onChange={() => handleToggle(todo)}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: '14px',
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {todo.todoText}
                  </p>
                  {todo.entryTitle && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      来自：{todo.entryTitle}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
