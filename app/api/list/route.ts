import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get('pageSize')) || 30));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const all = await list({ prefix: 'doodles/meta/' });
  const metas = await Promise.all(
    all.blobs.map(async (b) => {
      try {
        const res = await fetch(b.url);
        return await res.json();
      } catch { return null; }
    })
  );
  const entries = metas.filter(Boolean).sort((a:any,b:any)=> (b.createdAt||0) - (a.createdAt||0));

  const totalCount = entries.length;
  const start = (page - 1) * pageSize;
  const slice = entries.slice(start, start + pageSize);

  return NextResponse.json({ entries: slice, page, pageSize, totalCount, totalPages: Math.max(1, Math.ceil((totalCount || 0)/pageSize)) });
}