import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/lib/fetch-article';
import { extractKnowledge, hasApiKey } from '@/lib/ai';
import { getTopics } from '@/lib/notes';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: 'URL 不能为空' }, { status: 400 });

  const article = await fetchArticle(url.trim());
  if (!article) {
    return NextResponse.json({
      error: '无法获取文章内容',
      hint: '请尝试手动粘贴文章正文',
    }, { status: 422 });
  }

  let aiResult = null;
  if (hasApiKey()) {
    const topicNames = getTopics().map((t) => t.name);
    aiResult = await extractKnowledge(article.content, article.title, topicNames);
  }

  return NextResponse.json({
    title: article.title,
    url: article.url,
    knowledge: aiResult?.knowledge || [],
    actions: aiResult?.actions || [],
    reflection: aiResult?.reflection || '',
    suggestedTopic: aiResult?.suggestedTopic || null,
    hasAI: hasApiKey(),
  });
}
