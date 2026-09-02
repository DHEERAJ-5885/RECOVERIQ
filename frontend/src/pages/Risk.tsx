import { useApi } from '../lib/useApi';
import { Download, Filter, Calendar } from 'lucide-react';

export function Risk() {
  const { data: riskData, loading: riskLoading, error: riskError } = useApi<any>('/api/analytics/risk-breakdown');
  const { data: failureData, loading: failureLoading } = useApi<any>('/api/analytics/failure-reasons');

  if (riskLoading || failureLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="grid gap-6 md:grid-cols-3">
           {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
        </div>
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  if (riskError) {
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">Error loading risk data: {riskError.message}</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
  };

  const high = riskData?.HIGH || { count: 0, amount: 0 };
  const medium = riskData?.MEDIUM || { count: 0, amount: 0 };
  const low = riskData?.LOW || { count: 0, amount: 0 };

  const totalAmount = high.amount + medium.amount + low.amount;
  const getPercent = (amount: number) => totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Revenue at Risk</h2>
          <p className="text-slate-500 mt-1">Detailed breakdown of failed payments by priority.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export
           </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-red-100 bg-white dark:bg-slate-950 dark:border-red-900/30 p-7 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">High Risk (Immediate)</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{formatCurrency(high.amount)}</div>
          <p className="text-sm font-medium text-slate-500">{high.count} cases</p>
        </div>
        
        <div className="rounded-xl border border-amber-100 bg-white dark:bg-slate-950 dark:border-amber-900/30 p-7 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Medium Priority (Standard)</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{formatCurrency(medium.amount)}</div>
          <p className="text-sm font-medium text-slate-500">{medium.count} cases</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 p-7 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Low Priority (Relaxed)</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{formatCurrency(low.amount)}</div>
          <p className="text-sm font-medium text-slate-500">{low.count} cases</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-950 p-8 shadow-sm">
        <h3 className="text-lg font-bold mb-8 text-slate-900 dark:text-white">Risk Value Distribution</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">High Risk</span>
              <span className="font-medium text-slate-500">{getPercent(high.amount).toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${getPercent(high.amount)}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Medium Risk</span>
              <span className="font-medium text-slate-500">{getPercent(medium.amount).toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${getPercent(medium.amount)}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Low Risk</span>
              <span className="font-medium text-slate-500">{getPercent(low.amount).toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${getPercent(low.amount)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {failureData && (
        <div className="rounded-xl border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue at Risk by Failure Reason</h3>
             <div className="flex items-center gap-2">
               <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100">
                  <Filter className="w-3 h-3" /> Filter
               </button>
               <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100">
                  <Calendar className="w-3 h-3" /> Last 30 Days
               </button>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Failure Reason</th>
                  <th className="px-6 py-4">Cases</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">% of Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {failureData.map((item: any, idx: number) => {
                  const percent = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{item.reason.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.count}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <span className="text-slate-600 dark:text-slate-400 w-12">{percent.toFixed(1)}%</span>
                           <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" style={{ width: `${percent}%` }}></div>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
