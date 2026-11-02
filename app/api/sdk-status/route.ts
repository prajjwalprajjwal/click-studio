import { NextResponse } from 'next/server';
import { getSdkIngestionStatus, getClickSdkSpec } from '@/lib/click-sdk';

export async function GET() {
  try {
    const status = await getSdkIngestionStatus();
    const spec = await getClickSdkSpec();

    return NextResponse.json({
      success: true,
      status,
      spec: spec.spec
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check SDK ingestion status' },
      { status: 500 }
    );
  }
}
