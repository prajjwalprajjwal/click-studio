import { NextRequest, NextResponse } from 'next/server';
import { getApprovedApplets, createAppletSubmission } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;

    const applets = getApprovedApplets({ tag, search });
    return NextResponse.json({ success: true, applets });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch community applets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, author, description, tags, cppHeader, cppSource, jsCompanion, instructions } = body;

    if (!title || !author || !description || !jsCompanion) {
      return NextResponse.json(
        { error: 'Missing required applet fields (title, author, description, jsCompanion)' },
        { status: 400 }
      );
    }

    const created = createAppletSubmission({
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      tags: Array.isArray(tags) ? tags : ['community'],
      cppHeader: cppHeader || '// Auto-generated\n',
      cppSource: cppSource || '// Auto-generated\n',
      jsCompanion: jsCompanion.trim(),
      instructions: instructions || 'Tap ACTION to play.'
    });

    return NextResponse.json({
      success: true,
      message: 'Applet submitted successfully! It is now pending moderation by Click Studio admins.',
      applet: created
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to submit applet' },
      { status: 500 }
    );
  }
}
