import { useApi } from '../lib/useApi';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, User, IndianRupee, Clock, CheckCircle } from 'lucide-react';

export function Escalations() {
  const { data: escalationsData, loading, error } = useApi<any[]>('/api/escalations');

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="space-y-3 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Handle both flat case format or nested escalation format depending on backend state
  const cases = escalationsData?.map(e => e.case ? { ...e.case, customerEmail: e.customer?.email, customerName: e.customer?.name, eventType: e.event?.eventType || 'UNKNOWN', failureReason: e.event?.failureReason || 'UNKNOWN' } : e) || [];
  
  const escalatedCount = escalationsData?.length || 0;
  const totalRisk = cases?.reduce((sum: number, c: any) => sum + parseFloat(c.amountAtRisk || '0'), 0) || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Escalations
          </h2>
          <p className="text-slate-500 mt-1">
            Cases requiring manual human review and intervention.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{escalatedCount}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Escalations</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRisk)}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue at Risk</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">Manual</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Required</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load escalated cases: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Customer</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Amount at Risk</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Failure Reason</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Priority</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Created</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cases?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-green-500" />
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">All clear!</div>
                      <div className="text-sm text-slate-500">No escalated cases at this time.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                cases?.map((c) => {
                  const priorityStyles: Record<string, string> = {
                    HIGH: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400',
                    MEDIUM: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
                    LOW: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
                  };

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{c.customerEmail || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">#{c.id?.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(c.amountAtRisk))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {(c.failureReason || 'UNKNOWN').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          priorityStyles[c.priority] || 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/queue/${c.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1220] dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg text-xs font-semibold transition-all group/btn"
                        >
                          Review Case
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
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
  );
}
