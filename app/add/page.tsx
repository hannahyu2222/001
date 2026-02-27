import { getTopics } from '@/lib/notes';
import { hasApiKey } from '@/lib/ai';
import AddEntryForm from '@/components/AddEntryForm';

export const dynamic = 'force-dynamic';

export default function AddPage() {
  const topics = getTopics();
  const aiAvailable = hasApiKey();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">新增条目</h1>
        <p className="page-subtitle">
          {aiAvailable
            ? '粘贴文章链接，AI 自动提炼知识点'
            : '粘贴文章链接，手动填写知识点（配置 ANTHROPIC_API_KEY 可启用 AI 提炼）'}
        </p>
      </div>
      <div className="page-body">
        <AddEntryForm topics={topics} hasAI={aiAvailable} />
      </div>
    </div>
  );
}
