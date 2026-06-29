import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptPayload } from '../../utils/crypto';

// Initialize server-side Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { priceTolerance, volumeTolerance, statusFilter } = await request.json();

    // 1. Fetch trades in parallel with metrics
    const [tradesResult, metricsResult] = await Promise.all([
      supabase.rpc('get_dynamic_reconciliations', {
        price_tol: priceTolerance,
        vol_tol: volumeTolerance,
        status_filter: statusFilter
      }),
      supabase.rpc('get_reconciliation_summary_metrics', {
        price_tol: priceTolerance,
        vol_tol: volumeTolerance
      })
    ]);

    if (tradesResult.error) {
      throw new Error(`Trades fetch failed: ${tradesResult.error.message}`);
    }
    if (metricsResult.error) {
      throw new Error(`Metrics fetch failed: ${metricsResult.error.message}`);
    }

    const trades = tradesResult.data || [];
    const summary = metricsResult.data?.[0] || { total_count: 0, perfect_count: 0, anomaly_count: 0 };

    const metrics = {
      total: Number(summary.total_count),
      perfect: Number(summary.perfect_count),
      anomalies: Number(summary.anomaly_count)
    };

    // 2. Encrypt the response payload
    const encryptedData = await encryptPayload({ trades, metrics });

    return NextResponse.json({ payload: encryptedData });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
