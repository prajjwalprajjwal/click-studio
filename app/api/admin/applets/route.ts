import { NextRequest, NextResponse } from 'next/server';
import { getAllAppletsForAdmin, updateAppletStatus } from '@/lib/db';

function extractAdminKey(req: NextRequest): string {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return req.headers.get('x-admin-key') || '';
}

export async function GET(req: NextRequest) {
  try {
    const adminKey = extractAdminKey(req);
    const expected = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';

    if (!adminKey || adminKey !== expected) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin secret key' },
        { status: 401 }
      );
    }

    const applets = getAllAppletsForAdmin(adminKey);
    return NextResponse.json({ success: true, applets });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Admin authentication failed' },
      { status: 403 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminKey = extractAdminKey(req);
    const expected = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';

    if (!adminKey || adminKey !== expected) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin secret key' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, action, rejectionReason } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid parameters. id and action (approve|reject) are required.' },
        { status: 400 }
      );
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updated = updateAppletStatus(id, status, adminKey, rejectionReason);

    return NextResponse.json({
      success: true,
      message: `Applet ${action}d successfully!`,
      applet: updated
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update applet moderation status' },
      { status: 500 }
    );
  }
}
