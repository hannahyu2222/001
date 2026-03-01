'use client';

import { useState } from 'react';

interface Quote {
  text: string;
  caption: string;
  tags: string[];
}

export default function QuotesExtractor({ hasAI }: { hasAI: boolean }) {
  const [rawText, setRawText] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  async function handleExtract() {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setQuotes([]);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提炼失败');
      } else {
        setQuotes(data.quotes);
      }
    } catch {
      setError('请求失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function copyQuote(index: number, quote: Quote) {
    const text = `${quote.text}\n\n${quote.caption}\n\n${quote.tags.join(' ')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          把今天的碎片感悟全部粘贴进来
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="今天看了一篇文章说&#10;上午和朋友聊天突然想到&#10;刷到一个视频感觉很有道理&#10;&#10;什么都可以，随意写，AI帮你提炼成金句..."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            lineHeight: '1.7',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={handleExtract}
            disabled={loading || !rawText.trim() || !hasAI}
            className="btn btn-primary"
            style={{ minWidth: '120px' }}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                提炼中…
              </>
            ) : '✨ 提炼金句'}
          </button>
        </div>
        {!hasAI && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
            需要配置 ANTHROPIC_API_KEY 才能使用 AI 提炼
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {quotes.length > 0 && (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            提炼出 {quotes.length} 条金句，点击复制可直接发小红书 👇
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {quotes.map((quote, i) => (
              <div
                key={i}
                className="card"
                style={{ position: 'relative', cursor: 'default' }}
              >
                <p style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  marginBottom: '10px',
                  letterSpacing: '0.01em',
                }}>
                  {quote.text}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  marginBottom: '12px',
                }}>
                  {quote.caption}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {quote.tags.map((tag, j) => (
                    <span key={j} style={{
                      fontSize: '12px',
                      color: 'var(--accent)',
                      background: 'var(--accent-bg, rgba(99,102,241,0.08))',
                      padding: '2px 8px',
                      borderRadius: '20px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => copyQuote(i, quote)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  {copied === i ? '✓ 已复制' : '复制'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
