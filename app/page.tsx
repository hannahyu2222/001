import Link from 'next/link';
import { getTopics, getTopicStats } from '@/lib/notes';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const topics = getTopics();
  const topicsWithStats = topics.map((topic) => ({
    ...topic,
    stats: getTopicStats(topic.name),
  }));

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">我的知识主题</h1>
            <p className="page-subtitle">共 {topics.length} 个主题，看文章→粘贴链接→AI提炼→积累知识</p>
          </div>
          <Link href="/add" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新增条目
          </Link>
        </div>
      </div>

      <div className="page-body">
        {topicsWithStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>还没有知识主题</p>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>开始新增条目来创建你的第一个主题吧</p>
            <Link href="/add" className="btn btn-primary">新增第一个条目</Link>
          </div>
        ) : (
          <div className="card-grid">
            {topicsWithStats.map((topic) => (
              <Link key={topic.name} href={`/topic/${encodeURIComponent(topic.name)}`} style={{ display: 'block' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {topic.name}
                    </h2>
                    <span className="badge badge-accent">{topic.stats.entryCount} 条</span>
                  </div>
                  {topic.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                      {topic.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {topic.stats.pendingTodoCount > 0 && (
                      <span style={{ color: 'var(--accent)', fontWeight: '500' }}>
                        ○ {topic.stats.pendingTodoCount} 个待办
                      </span>
                    )}
                    {topic.stats.lastUpdated && (
                      <span>
                        更新于 {new Date(topic.stats.lastUpdated).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
