'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteTopicButton({ topicName, entryCount }: { topicName: string; entryCount: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/topics/${encodeURIComponent(topicName)}`, { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          确认删除主题{entryCount > 0 ? `（${entryCount} 条笔记不受影响）` : ''}？
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn"
          style={{ fontSize: '13px', padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none' }}
        >
          {deleting ? '删除中…' : '确认删除'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="btn btn-secondary"
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="btn btn-secondary"
      style={{ fontSize: '13px', padding: '6px 14px', color: '#dc2626' }}
    >
      删除主题
    </button>
  );
}
