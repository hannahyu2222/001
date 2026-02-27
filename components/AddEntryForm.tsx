'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Topic {
  name: string;
  description: string;
  createdAt: string;
}

interface Props {
  topics: Topic[];
  hasAI: boolean;
}

export default function AddEntryForm({ topics, hasAI }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [actions, setActions] = useState<string[]>(['']);
  const [reflection, setReflection] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchStatus, setFetchStatus] = useState('');
  const actionRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Try to read clipboard on mount
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          setUrl(text);
        }
      }).catch(() => {});
    }
  }, []);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setIsFetching(true);
    setError('');
    setFetchStatus('正在抓取文章...');

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), topics: topics.map((t) => t.name) }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '抓取失败');

      setSourceTitle(data.title || '');
      if (data.knowledge) setKnowledge(data.knowledge.join('\n'));
      if (data.actions) setActions(data.actions.length > 0 ? data.actions : ['']);
      if (data.reflection) setReflection(data.reflection);
      if (data.suggestedTopic && topics.find((t) => t.name === data.suggestedTopic)) {
        setSelectedTopic(data.suggestedTopic);
      } else if (data.suggestedTopic) {
        setNewTopicName(data.suggestedTopic);
        setIsCreatingTopic(true);
        setSelectedTopic('__new__');
      }
      setFetchStatus(hasAI ? 'AI 提炼完成' : '文章抓取完成，请手动填写知识点');
    } catch (e) {
      setError(e instanceof Error ? e.message : '抓取失败');
      setFetchStatus('');
    } finally {
      setIsFetching(false);
    }
  };

  const handleActionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newActions = [...actions];
      newActions.splice(idx + 1, 0, '');
      setActions(newActions);
      setTimeout(() => {
        actionRefs.current[idx + 1]?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && actions[idx] === '' && actions.length > 1) {
      e.preventDefault();
      const newActions = actions.filter((_, i) => i !== idx);
      setActions(newActions);
      setTimeout(() => {
        actionRefs.current[Math.max(0, idx - 1)]?.focus();
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const topicName = selectedTopic === '__new__' ? newTopicName.trim() : selectedTopic;
    if (!topicName) {
      setError('请选择或创建一个主题');
      return;
    }
    if (!knowledge.trim() && !reflection.trim()) {
      setError('请至少填写知识点或感悟');
      return;
    }

    setIsSaving(true);

    try {
      // Create new topic if needed
      if (selectedTopic === '__new__' && newTopicName.trim()) {
        const topicRes = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTopicName.trim(),
            description: newTopicDesc.trim(),
          }),
        });
        if (!topicRes.ok) {
          const d = await topicRes.json();
          if (!d.error?.includes('already exists')) {
            throw new Error(d.error || '创建主题失败');
          }
        }
      }

      // Create entry
      const knowledgeList = knowledge
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);
      const actionList = actions.filter((a) => a.trim()).map((a) => {
        if (a.startsWith('[ ]') || a.startsWith('[x]')) return a;
        return `[ ] ${a}`;
      });

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          source_url: url.trim() || undefined,
          source_title: sourceTitle.trim() || undefined,
          knowledge: knowledgeList,
          actions: actionList,
          reflection: reflection.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '保存失败');
      }

      setSuccess('条目已保存！');
      setTimeout(() => {
        router.push(`/topic/${encodeURIComponent(topicName)}`);
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* URL Input */}
      <div className="form-group">
        <label className="label">文章链接（可选）</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="url"
            className="input"
            placeholder="粘贴文章 URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleFetchUrl}
            disabled={isFetching || !url.trim()}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {isFetching ? (
              <span className="spinner" style={{ width: '16px', height: '16px' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {hasAI ? 'AI 提炼 →' : '抓取 →'}
          </button>
        </div>
        {fetchStatus && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {fetchStatus}
          </p>
        )}
      </div>

      {/* Source Title */}
      {(sourceTitle || url) && (
        <div className="form-group">
          <label className="label">文章标题</label>
          <input
            type="text"
            className="input"
            placeholder="文章标题..."
            value={sourceTitle}
            onChange={(e) => setSourceTitle(e.target.value)}
          />
        </div>
      )}

      {/* Knowledge Points */}
      <div className="form-group">
        <label className="label">知识点（每行一条）</label>
        <textarea
          className="textarea"
          placeholder={'- 知识点1\n- 知识点2\n- 知识点3'}
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          rows={5}
        />
      </div>

      {/* Action Items */}
      <div className="form-group">
        <label className="label">行动项（Enter 新增，Backspace 删除空行）</label>
        {actions.map((action, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0 }}>○</span>
            <input
              type="text"
              className="input"
              placeholder="行动项..."
              value={action.replace(/^\[([ x])\] /, '')}
              onChange={(e) => {
                const newActions = [...actions];
                const prefix = action.startsWith('[x]') ? '[x] ' : '[ ] ';
                newActions[idx] = prefix + e.target.value;
                setActions(newActions);
              }}
              onKeyDown={(e) => handleActionKeyDown(e, idx)}
              ref={(el) => { actionRefs.current[idx] = el; }}
            />
            {actions.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                style={{ flexShrink: 0, padding: '8px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setActions([...actions, ''])}
          style={{ fontSize: '13px', marginTop: '4px' }}
        >
          + 添加行动项
        </button>
      </div>

      {/* Reflection */}
      <div className="form-group">
        <label className="label">我的感悟</label>
        <textarea
          className="textarea"
          placeholder="写下你的感悟和思考..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
        />
      </div>

      {/* Topic Selection */}
      <div className="form-group">
        <label className="label">所属主题</label>
        <select
          className="select"
          value={selectedTopic}
          onChange={(e) => {
            setSelectedTopic(e.target.value);
            setIsCreatingTopic(e.target.value === '__new__');
          }}
        >
          <option value="">-- 选择主题 --</option>
          {topics.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
          <option value="__new__">+ 新建主题...</option>
        </select>
      </div>

      {/* New Topic Form */}
      {isCreatingTopic && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            新建主题
          </p>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">主题名称</label>
            <input
              type="text"
              className="input"
              placeholder="主题名称（简洁，2-6字）"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">描述（可选）</label>
            <input
              type="text"
              className="input"
              placeholder="简短描述这个主题..."
              value={newTopicDesc}
              onChange={(e) => setNewTopicDesc(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSaving}
        style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
      >
        {isSaving ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
            保存中...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            保存条目
          </>
        )}
      </button>
    </form>
  );
}
