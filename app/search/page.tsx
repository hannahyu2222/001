import SearchView from '@/components/SearchView';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">全文搜索</h1>
        <p className="page-subtitle">搜索所有主题和条目内容</p>
      </div>
      <div className="page-body">
        <SearchView />
      </div>
    </div>
  );
}
