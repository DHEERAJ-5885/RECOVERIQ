import { useApi } from '../lib/useApi';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Zap, ShieldAlert, ArrowUpRight, TrendingUp } from 'lucide-react';

export function Overview() {
  const { data, loading, error } = useApi<any>('/api/analytics/dashboard');

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
           {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">Error loading dashboard: {error.message}</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h2>
        <p className="text-slate-500 mt-1">Real-time revenue recovery performance and AI insights.</p>
      </div>
      
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Total At Risk
              </div>
              <div className="text-3xl font-bold mt-4 tracking-tight">{formatCurrency(data?.totalRevenueAtRisk || 0)}</div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{data?.totalCases || 0} cases</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Est. Recoverable
              </div>
              <div className="text-3xl font-bold mt-4 tracking-tight text-blue-600 dark:text-blue-400">{formatCurrency(data?.estRecoverable || 0)}</div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">AI projected</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Active Cases
              </div>
              <div className="text-3xl font-bold mt-4 tracking-tight">{data?.activeCases || 0}</div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending action</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Recovered
              </div>
              <div className="text-3xl font-bold mt-4 tracking-tight text-green-600 dark:text-green-500">{formatCurrency(data?.recoveredRevenue || 0)}</div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{data?.recoveredCases || 0} payments</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                 Avg. Probability
              </div>
              <div className="text-3xl font-bold mt-4 tracking-tight">{data?.avgProbability || 0}%</div>
            </div>
            <div className="flex flex-col mt-4">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-1000" style={{ width: `${data?.avgProbability || 0}%` }}></div>
              </div>
              <span className="text-xs font-medium text-green-600 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> 12% vs last 7d</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-7">
        <div className="rounded-xl border bg-white dark:bg-slate-950 p-7 shadow-sm md:col-span-4">
          <h3 className="text-lg font-bold mb-8 text-slate-900 dark:text-white">Pipeline Health</h3>
          <div className="space-y-8">
             <div>
               <div className="flex justify-between text-sm mb-3">
                 <span className="font-semibold text-slate-700 dark:text-slate-300">Conversion Rate</span>
                 <span className="font-bold text-slate-900 dark:text-white">{data?.recoveryRate || 0}%</span>
               </div>
               <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${data?.recoveryRate || 0}%` }}></div>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="p-5 border border-amber-100 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 rounded-xl flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-500 mb-1">{data?.awaitingPayment || 0}</div>
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Awaiting Payment</div>
               </div>
               <div className="p-5 border border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-1">{Math.max(0, (data?.totalCases || 0) - (data?.activeCases || 0) - (data?.recoveredCases || 0))}</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Closed / Failed</div>
               </div>
             </div>
          </div>
        </div>
        
        <div className="rounded-xl border shadow-sm md:col-span-3 overflow-hidden flex flex-col justify-center items-center relative">
            <div className="absolute inset-0 bg-[#0B1220]"></div>
            
            <div className="relative z-10 flex flex-col items-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-5 border border-white/20">
                <ShieldAlert className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">AI Policy Engine Active</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed px-4">
                Guardrails are actively monitoring ML recommendations to prevent customer friction.
              </p>
              <Link to="/policies" className="group flex items-center justify-center px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-all">
                Review Guardrails
                <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
        </div>
      </div>
    </div>
  )
}
