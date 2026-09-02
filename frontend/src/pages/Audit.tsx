import { useApi } from '../lib/useApi';
import { ScrollText, Download, Search, Clock, Cpu, ShieldCheck, Zap, AlertTriangle, CreditCard, CheckCircle, FileText } from 'lucide-react';
import { useState } from 'react';

const getActionIcon = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('webhook')) return CreditCard;
  if (lower.includes('case_status')) return CheckCircle;
  if (lower.includes('policy')) return ShieldCheck;
  if (lower.includes('payment_link')) return Zap;
  if (lower.includes('created') || lower.includes('detected')) return FileText;
  if (lower.includes('executed') || lower.includes('action')) return Cpu;
  return Clock;
};

const getActionColor = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('case_status_updated') && lower.includes('recovered')) return 'text-green-600 dark:text-green-400';
  if (lower.includes('webhook')) return 'text-blue-600 dark:text-blue-400';
  if (lower.includes('payment_link')) return 'text-indigo-600 dark:text-indigo-400';
  if (lower.includes('policy')) return 'text-amber-600 dark:text-amber-400';
  if (lower.includes('failed') || lower.includes('error')) return 'text-red-600 dark:text-red-400';
  return 'text-slate-600 dark:text-slate-400';
};

const getActionBgColor = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('webhook')) return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
  if (lower.includes('case_status')) return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
  if (lower.includes('policy')) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  if (lower.includes('payment_link')) return 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800';
  if (lower.includes('created') || lower.includes('detected')) return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
};

const getEntityLabel = (entityType: string) => {
  const labels: Record<string, { bg: string; text: string }> = {
    case: { bg: 'bg-blue-100 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400' },
    action: { bg: 'bg-purple-100 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400' },
    policy: { bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
    webhook: { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
    event: { bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
  };
  const style = labels[entityType?.toLowerCase()] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
  return style;
};

const getResultBadge = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('recovered') || lower.includes('success') || lower.includes('received')) {
    return { label: 'Success', style: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' };
  }
  if (lower.includes('payment_link_generated')) {
    return { label: 'Generated', style: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' };
  }
  if (lower.includes('policy_checked')) {
    return { label: 'Checked', style: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' };
  }
  if (lower.includes('created') || lower.includes('detected')) {
    return { label: 'Created', style: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' };
  }
  return null;
};

export function Audit() {
  const { data: logs, loading, error } = useApi<any[]>('/api/audit');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="space-y-3 mt-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.entityType?.toLowerCase().includes(q) ||
      log.entityId?.toLowerCase().includes(q) ||
      log.source?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Trail
          </h2>
          <p className="text-slate-500 mt-1">
            Complete history of all recovery events, predictions, policies, and actions.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#0B1220] dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
        <input
          type="text"
          placeholder="Search by action, entity, case ID, or source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
        />
        {searchQuery && (
          <span className="text-xs text-slate-500 whitespace-nowrap ml-3">
            {filteredLogs?.length || 0} results
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load audit logs: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Time</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Entity</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Action</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Source</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <ScrollText className="w-7 h-7 text-slate-400" />
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {searchQuery ? 'No matching logs found' : 'Audit log is empty'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {searchQuery ? 'Try adjusting your search query.' : 'Events will appear here as the system processes recovery cases.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs?.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const actionColor = getActionColor(log.action);
                  const actionBg = getActionBgColor(log.action);
                  const entityStyle = getEntityLabel(log.entityType);
                  const resultBadge = getResultBadge(log.action);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${entityStyle.bg} ${entityStyle.text}`}>
                          {log.entityType}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          #{log.entityId?.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${actionBg}`}>
                            <ActionIcon className={`w-4 h-4 ${actionColor}`} />
                          </div>
                          <span className={`font-semibold text-sm ${actionColor}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {log.source || 'System'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {resultBadge ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${resultBadge.style}`}>
                            {resultBadge.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filteredLogs && filteredLogs.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLogs.length} of {logs?.length || 0} log entries
            </span>
            <span className="text-xs text-slate-400">
              Latest: {logs?.[0] ? new Date(logs[0].createdAt).toLocaleString() : '—'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
