"use client";

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState, useMemo } from 'react';

// Initialize Supabase Connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TradeRecord {
  matched_id: string;
  ticker: string;
  internal_price: number | null;
  broker_price: number | null;
  internal_volume: number | null;
  broker_volume: number | null;
}

export default function InteractiveDashboard() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive UI States
  const [priceTolerance, setPriceTolerance] = useState<number>(0.05);
  const [volumeTolerance, setVolumeTolerance] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Fetch all trade pairs once on load
  useEffect(() => {
    async function fetchTrades() {
      const { data } = await supabase
        .from('vw_reconciliation_results')
        .select('matched_id, ticker, internal_price, broker_price, internal_volume, broker_volume');
      
      if (data) setTrades(data);
      setLoading(false);
    }
    fetchTrades();
  }, []);

  // Live Engine Logic: Dynamically re-evaluate every trade based on slider values
  const processedTrades = useMemo(() => {
    return trades.map(trade => {
      const pDiff = Math.abs((trade.internal_price || 0) - (trade.broker_price || 0));
      const vDiff = Math.abs((trade.internal_volume || 0) - (trade.broker_volume || 0));

      let currentStatus = "Perfect Match";
      
      if (!trade.internal_price) {
        currentStatus = "Missing in Internal";
      } else if (!trade.broker_price) {
        currentStatus = "Missing in Broker";
      } else if (pDiff > priceTolerance) {
        currentStatus = "Price Mismatch";
      } else if (vDiff > volumeTolerance) {
        currentStatus = "Volume Mismatch";
      }

      return {
        ...trade,
        calculatedStatus: currentStatus,
        priceDelta: pDiff,
        volumeDelta: vDiff
      };
    });
  }, [trades, priceTolerance, volumeTolerance]);

  // Dynamic Metrics Analytics
  const metrics = useMemo(() => {
    const total = processedTrades.length;
    const matched = processedTrades.filter(t => t.calculatedStatus === "Perfect Match").length;
    const anomalies = total - matched;
    
    return { total, matched, anomalies };
  }, [processedTrades]);

  // Apply Status Dropdown Filter
  const filteredTrades = useMemo(() => {
    if (statusFilter === "All") return processedTrades;
    if (statusFilter === "Anomalies") return processedTrades.filter(t => t.calculatedStatus !== "Perfect Match");
    return processedTrades.filter(t => t.calculatedStatus === statusFilter);
  }, [processedTrades, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading institutional database pipelines...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">Trade Reconciliation Command Center</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time cross-ledger matching engine & automated anomaly threshold controls.</p>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded border border-emerald-200">
            Engine Active
          </span>
        </header>

        {/* Metrics Counter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Evaluated Trades</p>
            <p className="text-3xl font-light mt-2">{metrics.total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Perfect Matches</p>
            <p className="text-3xl font-light mt-2 text-emerald-600">{metrics.matched}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Flagged Anomalies</p>
            <p className="text-3xl font-light mt-2 text-red-600">{metrics.anomalies}</p>
          </div>
        </div>

        {/* Control Panel (Sliders & Filters) */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Price Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 flex justify-between">
              <span>Price Tolerance Breakpoint</span>
              <span className="font-mono text-gray-900 font-bold">${priceTolerance.toFixed(2)}</span>
            </label>
            <input 
              type="range" min="0.00" max="2.00" step="0.05"
              value={priceTolerance}
              onChange={(e) => setPriceTolerance(parseFloat(e.target.value))}
              className="w-full accent-gray-900 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 flex justify-between">
              <span>Volume Tolerance Breakpoint</span>
              <span className="font-mono text-gray-900 font-bold">{volumeTolerance} Units</span>
            </label>
            <input 
              type="range" min="0" max="50" step="1"
              value={volumeTolerance}
              onChange={(e) => setVolumeTolerance(parseInt(e.target.value))}
              className="w-full accent-gray-900 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
            />
          </div>

          {/* Dropdown Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Filter View State</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-gray-900 transition-colors"
            >
              <option value="All">All Evaluated Records</option>
              <option value="Anomalies">All Flagged Anomalies</option>
              <option value="Perfect Match">Perfect Matches Only</option>
              <option value="Price Mismatch">Price Mismatches Only</option>
              <option value="Volume Mismatch">Volume Mismatches Only</option>
              <option value="Missing in Broker">Missing at Broker</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 border-b uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Trade ID</th>
                  <th className="p-4 font-semibold">Ticker</th>
                  <th className="p-4 font-semibold text-right">Internal (Ledger / Vol)</th>
                  <th className="p-4 font-semibold text-right">External (Broker / Vol)</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                      No matching records found within current threshold parameters.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((row) => {
                    const isPerfect = row.calculatedStatus === "Perfect Match";
                    return (
                      <tr key={row.matched_id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{row.matched_id}</td>
                        <td className="p-4 font-medium text-gray-900">{row.ticker}</td>
                        <td className="p-4 text-right">
                          <span className="font-medium">${row.internal_price?.toFixed(2) || '---'}</span>
                          <span className="text-xs text-gray-400 block">{row.internal_volume || '---'} units</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-medium">${row.broker_price?.toFixed(2) || '---'}</span>
                          <span className="text-xs text-gray-400 block">{row.broker_volume || '---'} units</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${
                            isPerfect 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {row.calculatedStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </main>
  );
}