import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/lib/services/analytics';

// ── GET /api/analytics ─────────────────────────────────────────
export async function GET(_request: NextRequest) {
  try {
    const summary = await getAnalyticsSummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
