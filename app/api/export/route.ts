import { getAllEntries, getTopics } from '@/lib/notes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = getAllEntries();
  const topics = getTopics();

  const data = {
    exportedAt: new Date().toISOString(),
    topics,
    entries,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="notes-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
