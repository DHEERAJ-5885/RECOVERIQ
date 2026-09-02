import { useState } from 'react';
import { useApi } from '../lib/useApi';
import { Link } from 'react-router-dom';
import { Search, Filter, ArrowRight, ArrowDownToLine, MoreHorizontal, User } from 'lucide-react';

export function Queue() {
  const [filter, setFilter] = useState('ALL');
  const { data: cases, loading, error } = useApi<any[]>(`/api/cases?status=${filter}`);

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parseFloat(val));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recovery Queue</h2>
          <p className="text-slate-500 mt-1">Manage active recovery cases and AI recommendations.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
              <ArrowDownToLine className="w-4 h-4" /> Export CSV
           </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {error && <div className="p-4 text-red-500 bg-red-50 text-sm font-medium border-b border-red-100">Failed to load cases: {error.message}</div>}
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative w-full sm:w-72">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Search customer email..." className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select 
                className="w-full appearance-none pl-10 pr-8 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 dark:text-slate-300"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="RECOMMENDED">Recommended</option>
                <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RECOVERED">Recovered</option>
                <option value="FAILED">Failed</option>
              </select>
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount Risk</th>
                <th className="px-6 py-4">Failure Reason</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32 mb-2"></div><div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded w-20"></div></td>
                     <td className="px-6 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-16"></div></td>
                     <td className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-24"></div></td>
                     <td className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-16"></div></td>
                     <td className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-24"></div></td>
                     <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : cases?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                       <Filter className="w-8 h-8 text-slate-300 mb-3" />
                       <p className="text-base font-medium text-slate-700 dark:text-slate-300">No cases found</p>
                       <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cases?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-500" />
                         </div>
                         <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{c.customerEmail}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{new Date(c.createdAt).toLocaleDateString()}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(c.amountAtRisk)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wider">
                        {c.failureReason?.replace(/_/g, ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        c.priority === 'HIGH' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50' :
                        c.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        c.status === 'RECOVERED' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/50' :
                        c.status === 'RECOMMENDED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' :
                        c.status === 'AWAITING_PAYMENT' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/queue/${c.id}`} 
                          className="inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors bg-slate-900 text-white hover:bg-slate-800 px-3 py-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          Review <ArrowRight className="w-3 h-3 ml-1.5" />
                        </Link>
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                           <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 bg-white dark:bg-slate-950 mt-auto">
           <span>Showing 1 to {cases?.length || 0} of {cases?.length || 0} entries</span>
           <div className="flex gap-1">
             <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-400 cursor-not-allowed">Previous</button>
             <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-400 cursor-not-allowed">Next</button>
           </div>
        </div>
      </div>
    </div>
  )
}
