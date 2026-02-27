import { getAllPendingTodos } from '@/lib/notes';
import TodoList from '@/components/TodoList';

export const dynamic = 'force-dynamic';

export default function TodosPage() {
  const todos = getAllPendingTodos();

  // Group by topic
  const grouped = todos.reduce<Record<string, typeof todos>>((acc, todo) => {
    if (!acc[todo.entryTopic]) acc[todo.entryTopic] = [];
    acc[todo.entryTopic].push(todo);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">行动项</h1>
        <p className="page-subtitle">共 {todos.length} 个待完成行动项</p>
      </div>
      <div className="page-body">
        {todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>所有行动项已完成！</p>
            <p style={{ fontSize: '14px' }}>继续新增条目来记录新的行动计划</p>
          </div>
        ) : (
          <TodoList grouped={grouped} />
        )}
      </div>
    </div>
  );
}
