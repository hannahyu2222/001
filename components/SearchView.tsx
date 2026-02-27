'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface SearchEntry {
  id: string;
  topic: string;
  source_title?: string;
  source_url?: string;
  knowledge: string[];
  actions: string[];
  reflection: string;
  created_at: string;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/entries?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Debounce
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => doSearch(val), 300);
  };

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="input"
          placeholder="搜索知识点、行动项、感悟..."
          value={query}
          onChange={handleInput}
          style={{ paddingLeft: '40px' }}
          autoFocus
        />
        {isSearching && (
          <span
            className="spinner"
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        )}
      </div>

      {searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>未找到相关内容</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            找到 {results.length} 条结果
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((entry) => (
              <div key={entry.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <Link
                    href={`/topic/${encodeURIComponent(entry.topic)}`}
                    style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}
                  >
                    <Highlight text={entry.topic} query={query} />
                  </Link>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(entry.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {entry.source_title && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <Highlight text={entry.source_title} query={query} />
                  </p>
                )}
                {entry.knowledge.length > 0 && (
                  <ul style={{ fontSize: '13px', paddingLeft: '16px', marginBottom: '6px' }}>
                    {entry.knowledge.slice(0, 3).map((k, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>
                        <Highlight text={k} query={query} />
                      </li>
                    ))}
                  </ul>
                )}
                {entry.reflection && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    <Highlight text={entry.reflection.slice(0, 100)} query={query} />
                    {entry.reflection.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
