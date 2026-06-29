"use client";

import { useEffect, useState } from 'react';
import { decryptPayload } from './utils/crypto';

interface TradeRecord {
  matched_id: string;
  ticker: string;
  internal_price: number | null;
  broker_price: number | null;
  internal_volume: number | null;
  broker_volume: number | null;
  price_delta: number | null;
  volume_delta: number | null;
  status: string;
}

export default function ServerSideDashboard() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isQuerying, setIsQuerying] = useState(true);
  
  // UI Controls State
  const [priceTolerance, setPriceTolerance] = useState<number>(0.05);
  const [volumeTolerance, setVolumeTolerance] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Global Metrics State (Restoring our top counter cards)
  const [metrics, setMetrics] = useState({ total: 0, perfect: 0, anomalies: 0 });

  // SERVER-SIDE FETCHING ENGINE WITH DEBOUNCE
  useEffect(() => {
    const fetchFromDatabase = async () => {
      setIsQuerying(true);
      
      try {
        const response = await fetch('/api/reconciliations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceTolerance,
            volumeTolerance,
            statusFilter,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.payload) {
          // Decrypt the AES-GCM encrypted payload
          const decrypted = await decryptPayload(data.payload);
          setTrades(decrypted.trades || []);
          setMetrics(decrypted.metrics || { total: 0, perfect: 0, anomalies: 0 });
        }
      } catch (err) {
        console.error("Database query failed:", err);
      } finally {
        setIsQuerying(false);
      }
    };

    // Wait 300ms after the user stops moving the slider before querying the DB to prevent server overload
    const timeoutId = setTimeout(() => {
      fetchFromDatabase();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [priceTolerance, volumeTolerance, statusFilter]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">Trade Reconciliation Command Center</h1>
            <p className="text-gray-500 text-sm mt-1">Server-Side SQL Processing via PostgreSQL RPC.</p>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
            isQuerying ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isQuerying ? 'Executing SQL Query...' : 'Database Synchronized'}
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
            <p className="text-3xl font-light mt-2 text-emerald-600">{metrics.perfect}</p>
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
            <label className="text-xs font-medium text-gray-500">Database Filter Query</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-gray-900 transition-colors"
            >
              <option value="All">Fetch All Records</option>
              <option value="Anomalies">Fetch Anomalies Only</option>
              <option value="Perfect Match">Fetch Perfect Matches</option>
              <option value="Price Mismatch">Fetch Price Mismatches</option>
              <option value="Volume Mismatch">Fetch Volume Mismatches</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-opacity duration-300 ${isQuerying ? 'opacity-50' : 'opacity-100'}`}>
          <div className="overflow-x-auto h-[600px] overflow-y-auto relative">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 border-b uppercase text-[10px] tracking-wider sticky top-0 shadow-sm">
                <tr>
                  <th className="p-4 font-semibold">Trade ID</th>
                  <th className="p-4 font-semibold">Ticker</th>
                  <th className="p-4 font-semibold text-right">Internal Ledger</th>
                  <th className="p-4 font-semibold text-right">External Broker</th>
                  <th className="p-4 font-semibold text-center">Engine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                      Database returned 0 rows for the current query parameters.
                    </td>
                  </tr>
                ) : (
                  trades.map((row) => {
                    const isPerfect = row.status === "Perfect Match";
                    return (
                      <tr key={row.matched_id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{row.matched_id}</td>
                        <td className="p-4 font-medium text-gray-900">{row.ticker}</td>
                        <td className="p-4 text-right">
                          <span className="font-medium">${row.internal_price?.toFixed(2) || '---'}</span>
                          <span className="text-xs text-gray-400 block">{row.internal_volume || '---'} vol</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-medium">${row.broker_price?.toFixed(2) || '---'}</span>
                          <span className="text-xs text-gray-400 block">{row.broker_volume || '---'} vol</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${
                            isPerfect 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {row.status}
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