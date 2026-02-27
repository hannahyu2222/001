'use client';

import { useState } from 'react';
import type { Entry } from '@/lib/notes';

interface Props {
  entry: Entry;
  highlightQuery?: string;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function EntryCard({ entry, highlightQuery = '' }: Props) {
  const [actions, setActions] = useState(entry.actions);
  const [isToggling, setIsToggling] = useState<number | null>(null);

  const handleToggle = async (idx: number) => {
    setIsToggling(idx);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoToggle: idx }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActions(updated.actions);
      }
    } catch (e) {
      console.error('Toggle todo failed:', e);
    } finally {
      setIsToggling(null);
    }
  };

  const pendingCount = actions.filter((a) => a.startsWith('[ ]')).length;

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          {entry.source_title && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              {entry.source_url ? (
                <a
                  href={entry.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                >
                  {highlightQuery ? highlight(entry.source_title, highlightQuery) : entry.source_title}
                </a>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{entry.source_title}</span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {new Date(entry.created_at).toLocaleDateString('zh-CN')}
            </span>
            {pendingCount > 0 && (
              <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                {pendingCount} 待办
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="entry-content">
        {/* Knowledge Points */}
        {entry.knowledge.length > 0 && (
          <div>
            <h2>知识点</h2>
            <ul>
              {entry.knowledge.map((k, i) => (
                <li key={i}>
                  {highlightQuery ? highlight(k, highlightQuery) : k}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {actions.filter(a => a.trim()).length > 0 && (
          <div>
            <h2>行动项</h2>
            {actions.map((action, idx) => {
              const isDone = action.startsWith('[x]');
              const text = action.replace(/^\[([ x])\] /, '');
              return (
                <div key={idx} className="todo-item">
                  <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={isDone}
                    disabled={isToggling === idx}
                    onChange={() => handleToggle(idx)}
                  />
                  <span style={{ fontSize: '14px', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {highlightQuery ? highlight(text, highlightQuery) : text}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reflection */}
        {entry.reflection && (
          <div>
            <h2>我的感悟</h2>
            <p>{highlightQuery ? highlight(entry.reflection, highlightQuery) : entry.reflection}</p>
          </div>
        )}
      </div>
    </div>
  );
}
