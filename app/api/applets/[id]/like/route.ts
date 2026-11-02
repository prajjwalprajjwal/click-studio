import { NextRequest, NextResponse } from 'next/server';
import { toggleAppletLike } from '@/lib/db';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing applet ID' }, { status: 400 });
    }

    const likes = toggleAppletLike(id);
    return NextResponse.json({ success: true, likes });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to like applet' },
      { status: 500 }
    );
  }
}
