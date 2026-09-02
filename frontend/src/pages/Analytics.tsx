import { useApi } from '../lib/useApi';
import { BarChart, TrendingUp, Download, PieChart, Activity, Calendar } from 'lucide-react';

export function Analytics() {
  const { data: failureReasons, loading: l1 } = useApi<any[]>('/api/analytics/failure-reasons');
  const { data: actions, loading: l2 } = useApi<any[]>('/api/analytics/action-distribution');
  const { data: statuses, loading: l3 } = useApi<any[]>('/api/analytics/status-distribution');
  const { data: recoveryOverTime, loading: l4 } = useApi<any[]>('/api/analytics/recovery-over-time');

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto pb-12">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-8"></div>
        <div className="grid md:grid-cols-2 gap-6">
           <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
           <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
           <div className="md:col-span-2 h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
           <div className="md:col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Find max values for progress bars
  const maxFailureAmount = Math.max(...(failureReasons?.map(r => r.amount) || [0]));
  const maxActionCount = Math.max(...(actions?.map(a => parseInt(a.count)) || [0]));
  const maxRecoveryAmount = Math.max(...(recoveryOverTime?.map(r => r.recoveredAmount) || [0]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics Studio</h2>
          <p className="text-slate-500 mt-1">Deep dive into failure causes and action performance metrics.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
              <Calendar className="w-4 h-4" /> Last 30 Days
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-[#0B1220] dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export Report
           </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Failure Reasons */}
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
               <PieChart className="w-5 h-5 mr-2 text-slate-400" />
               Failure Distribution
            </h3>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-5">
              {failureReasons?.map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{r.reason.replace(/_/g, ' ')}</span>
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(r.amount)}</div>
                      <div className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">{r.count} events</div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${maxFailureAmount > 0 ? (r.amount / maxFailureAmount) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
               <Activity className="w-5 h-5 mr-2 text-slate-400" />
               Action Performance
            </h3>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-4">
              {actions?.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 group hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                       <BarChart className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">{a.actionType.replace(/_/g, ' ')}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        a.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
                        a.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="font-black text-lg text-slate-900 dark:text-white">{a.count}</div>
                     <div className="text-[10px] font-semibold text-slate-500 uppercase">Executions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case Status Pipeline */}
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm md:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
               <TrendingUp className="w-5 h-5 mr-2 text-slate-400" />
               Case Status Pipeline
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              {statuses?.map((s, i) => (
                <div key={i} className="flex-1 min-w-[160px] bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    s.status === 'RECOVERED' ? 'bg-green-500' :
                    s.status === 'RECOMMENDED' ? 'bg-blue-500' :
                    s.status === 'AWAITING_PAYMENT' ? 'bg-amber-500' :
                    s.status === 'FAILED' ? 'bg-red-500' : 'bg-slate-400'
                  }`}></div>
                  
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4">{s.status.replace(/_/g, ' ')}</div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">{s.count}</div>
                      <div className="text-xs font-medium text-slate-400 mt-1">Total Cases</div>
                    </div>
                    <div className="text-right pb-1">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(s.amount)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Over Time */}
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm md:col-span-2">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
               <Calendar className="w-5 h-5 mr-2 text-slate-400" />
               Recovery Over Time
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {recoveryOverTime?.map((r, i) => (
                <div key={i} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Risk</div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(r.riskAmount)}</div>
                      </div>
                      <div>
                        <div className="text-green-600 dark:text-green-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Recovered</div>
                        <div className="font-bold text-green-700 dark:text-green-400 text-sm">{formatCurrency(r.recoveredAmount)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative">
                     <div className="h-full bg-red-400/50 absolute left-0 top-0" style={{ width: `${r.riskAmount > 0 ? (r.riskAmount / (r.riskAmount + r.recoveredAmount)) * 100 : 0}%` }}></div>
                     <div className="h-full bg-green-500 rounded-full relative z-10" style={{ width: `${maxRecoveryAmount > 0 ? (r.recoveredAmount / maxRecoveryAmount) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
