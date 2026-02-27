import ImportWizard from '@/components/ImportWizard';
import { getTopics } from '@/lib/notes';
import { hasApiKey } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  const topics = getTopics();
  const aiAvailable = hasApiKey();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bear 笔记导入</h1>
        <p className="page-subtitle">将 Bear 导出的 Markdown 文件导入到知识库</p>
      </div>
      <div className="page-body">
        <ImportWizard existingTopics={topics} hasAI={aiAvailable} />
      </div>
    </div>
  );
}
