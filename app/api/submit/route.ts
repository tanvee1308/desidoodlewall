import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const BAD = [
  "fuck","fucking","fuk","f*ck","f u c k",
  "shit","sh*t","sht",
  "chutiya","chutiyā","chutia","chut","chuteya",
  "madarchod","maa ki chut","maadarchod","mc",
  "bhenchod","behenchod","bc",
  "gaand","gand","gandu","g*ndu",
  "choot","lund","land",
  "randi","randwa","randde",
  "harami","haraami",
  "kutte","kutti","kuttiya",
  "saala","sala","bsdk","bhosdike","bhosda","bhosadi",
  "bhadwe","bhadva",
  "gaand mara","gaandmara","gaandu",
  "cunt","cu*t",
  "asshole","ass","arse","arsehole",
  "bastard","bloody hell",
  "slut","whore",
  "porn","sex"
];

export async function POST(req: NextRequest) {
  try {
    const { word, meaning, language, dataUrl } = await req.json();

    if (!meaning || !language || !dataUrl?.startsWith('data:image/png')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const lower = (String(word||'') + ' ' + meaning).toLowerCase();
    if (BAD.some(b => lower.includes(b))) {
      return NextResponse.json({ error: 'Family-friendly only (no galis)' }, { status: 400 });
    }

    const base64 = dataUrl.split(',')[1];
    const bytes = Buffer.from(base64, 'base64');

    const id = `doodle_${Date.now()}`;

    // Upload image
    const img = await put(`doodles/images/${id}.png`, bytes, { access: 'public', contentType: 'image/png' });

    const entry = {
      id,
      imgUrl: img.url,
      word: String(word||'').slice(0, 50),
      meaning: String(meaning).slice(0, 180),
      language: String(language).slice(0, 40),
      createdAt: Date.now(),
    };

    // Upload metadata JSON
    await put(`doodles/meta/${id}.json`, JSON.stringify(entry), { access: 'public', contentType: 'application/json; charset=utf-8' });

    return NextResponse.json({ ok: true, entry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
