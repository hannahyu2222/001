import { NextRequest, NextResponse } from 'next/server';
import { extractQuotes } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { rawText } = await req.json();
  if (!rawText || !rawText.trim()) {
    return NextResponse.json({ error: '请输入感悟内容' }, { status: 400 });
  }

  const quotes = await extractQuotes(rawText);
  if (!quotes) {
    return NextResponse.json({ error: '提炼失败，请检查 API Key 配置' }, { status: 500 });
  }

  return NextResponse.json({ quotes });
}
