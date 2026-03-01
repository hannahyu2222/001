import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTopics, getEntriesByTopic } from '@/lib/notes';
import EntryCard from '@/components/EntryCard';
import DeleteTopicButton from '@/components/DeleteTopicButton';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ name: string }>;
}

export default async function TopicPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const topics = getTopics();
  const topic = topics.find((t) => t.name === decodedName);
  if (!topic) notFound();

  const entries = getEntriesByTopic(decodedName);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>← 主题</Link>
              <span style={{ color: 'var(--border)' }}>/</span>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{topic.name}</h1>
            </div>
            {topic.description && (
              <p className="page-subtitle">{topic.description}</p>
            )}
            <p className="page-subtitle">共 {entries.length} 条笔记</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <DeleteTopicButton topicName={topic.name} entryCount={entries.length} />
            <Link
              href={`/add`}
              className="btn btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body">
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <p>这个主题还没有条目</p>
            <Link href="/add" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
              新增第一个条目
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
