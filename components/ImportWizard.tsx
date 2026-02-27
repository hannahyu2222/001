'use client';

import { useState } from 'react';

interface Topic {
  name: string;
  description: string;
  createdAt: string;
}

interface BearNoteAnalysis {
  originalTitle: string;
  suggestedTopic: string;
  knowledge: string[];
  actions: string[];
  reflection: string;
}

interface Props {
  existingTopics: Topic[];
  hasAI: boolean;
}

type Step = 'input' | 'analyze' | 'confirm' | 'done';

export default function ImportWizard({ existingTopics, hasAI }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [folderPath, setFolderPath] = useState('');
  const [analyses, setAnalyses] = useState<BearNoteAnalysis[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleAnalyze = async () => {
    if (!folderPath.trim()) {
      setError('请输入文件夹路径');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          existingTopics: existingTopics.map((t) => t.name),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失败');
      setAnalyses(data.analyses || []);
      setSelected(new Set(data.analyses.map((_: BearNoteAnalysis, i: number) => i)));
      setStep('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const toImport = analyses.filter((_, i) => selected.has(i));
    if (toImport.length === 0) {
      setError('请至少选择一条笔记');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '导入失败');
      setImportedCount(data.count || toImport.length);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
          导入成功！
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          已成功导入 {importedCount} 条笔记
        </p>
        <button
          className="btn btn-primary"
          onClick={() => { setStep('input'); setFolderPath(''); setAnalyses([]); setSelected(new Set()); }}
        >
          继续导入
        </button>
        <a href="/" className="btn btn-secondary" style={{ marginLeft: '12px' }}>
          返回主页
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
        {['1. 选择路径', '2. AI 分析', '3. 确认导入'].map((label, i) => {
          const stepMap: Step[] = ['input', 'analyze', 'confirm'];
          const isActive = stepMap.indexOf(step) === i;
          const isDone = stepMap.indexOf(step) > i;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: isActive ? 'var(--accent)' : isDone ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  color: isActive ? 'white' : isDone ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {label}
              </div>
              {i < 2 && <span style={{ color: 'var(--border)' }}>→</span>}
            </div>
          );
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Step 1: Input */}
      {step === 'input' && (
        <div>
          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            <strong>Bear 导出方式：</strong>在 Bear 中选择菜单 File → Export Notes → Markdown，
            将所有笔记导出到一个文件夹，然后输入该文件夹的绝对路径。
          </div>
          <div className="form-group">
            <label className="label">Bear 笔记文件夹路径</label>
            <input
              type="text"
              className="input"
              placeholder="/Users/yourname/Documents/BearExport"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              输入包含 .md 文件的文件夹的绝对路径
            </p>
          </div>
          {!hasAI && (
            <div className="alert alert-info">
              未配置 ANTHROPIC_API_KEY，将使用文件内容直接导入（不进行 AI 分析）
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                {hasAI ? 'AI 分析中...' : '读取文件中...'}
              </>
            ) : hasAI ? '下一步：AI 分析 →' : '下一步：读取文件 →'}
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              找到 {analyses.length} 篇笔记，已选择 {selected.size} 篇
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setSelected(new Set(analyses.map((_, i) => i)))}
                style={{ fontSize: '13px' }}
              >
                全选
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setSelected(new Set())}
                style={{ fontSize: '13px' }}
              >
                全不选
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {analyses.map((analysis, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: selected.has(idx) ? '1px solid var(--accent)' : undefined,
                  opacity: selected.has(idx) ? 1 : 0.6,
                }}
                onClick={() => toggleSelect(idx)}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleSelect(idx)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '14px' }}>{analysis.originalTitle}</strong>
                      <span className="badge badge-accent">{analysis.suggestedTopic}</span>
                    </div>
                    {analysis.knowledge.length > 0 && (
                      <ul style={{ fontSize: '12px', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                        {analysis.knowledge.slice(0, 2).map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                        {analysis.knowledge.length > 2 && <li style={{ color: 'var(--text-muted)' }}>+{analysis.knowledge.length - 2} 更多...</li>}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setStep('input')}
              disabled={isLoading}
            >
              ← 返回
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={isLoading || selected.size === 0}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  导入中...
                </>
              ) : `导入 ${selected.size} 篇笔记`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
