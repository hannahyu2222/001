import { hasApiKey } from '@/lib/ai';
import QuotesExtractor from '@/components/QuotesExtractor';

export const dynamic = 'force-dynamic';

export default function QuotesPage() {
  const aiAvailable = hasApiKey();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">金句提炼</h1>
        <p className="page-subtitle">把散乱的感悟扔进来，AI 帮你炼成小红书金句</p>
      </div>
      <div className="page-body">
        <QuotesExtractor hasAI={aiAvailable} />
      </div>
    </div>
  );
}
