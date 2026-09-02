import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Cpu, Activity, Clock, FileText, User, ArrowUpRight, CheckCircle, ExternalLink, RefreshCw, XCircle, AlertTriangle, StopCircle } from 'lucide-react';

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useApi<any>(`/api/cases/${id}`);
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('GENERATE_PAYMENT_LINK');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Poll for updates if case is AWAITING_PAYMENT
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (data?.case?.status === 'AWAITING_PAYMENT') {
      interval = setInterval(() => {
        refetch();
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data?.case?.status, refetch]);

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !data) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 max-w-xl mx-auto mt-12">Error loading case details</div>;

  const { case: recoveryCase, customer, predictions, actions, auditLogs } = data;
  const latestPrediction = predictions?.[0];
  const pendingAction = actions?.find((a: any) => a.status === 'PENDING');
  const completedActions = actions?.filter((a: any) => a.status !== 'PENDING') || [];

  const handleManualAction = async (actionType: string, reason?: string) => {
    setExecuting(true);
    setExecuteError(null);
    try {
      const res = await fetch(`/api/recovery/${id}/manual-action`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, reason })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Execution failed');
      }
      await refetch();
      if (actionType === 'REJECT_RECOMMENDATION') setRejectModalOpen(false);
      if (actionType === 'CONTACT_CUSTOMER') setContactModalOpen(false);
    } catch (err: any) {
      setExecuteError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecuteError(null);
    try {
      const res = await fetch(`/api/recovery/${id}/execute`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Execution failed');
      }
      await refetch();
    } catch (err: any) {
      setExecuteError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parseFloat(val));
  };

  const isRecovered = recoveryCase.status === 'RECOVERED';
  const canExecute = pendingAction && !isRecovered && recoveryCase.status !== 'STOPPED' && recoveryCase.status !== 'AWAITING_PAYMENT';
  
  // Status styling logic
  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'RECOVERED': return { bg: 'bg-green-500', text: 'text-white', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800', icon: <CheckCircle className="w-4 h-4 mr-1.5" /> };
      case 'RECOMMENDED': return { bg: 'bg-blue-500', text: 'text-white', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: <Cpu className="w-4 h-4 mr-1.5" /> };
      case 'AWAITING_PAYMENT': return { bg: 'bg-amber-500', text: 'text-white', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: <Clock className="w-4 h-4 mr-1.5" /> };
      case 'FAILED': return { bg: 'bg-red-500', text: 'text-white', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: <XCircle className="w-4 h-4 mr-1.5" /> };
      default: return { bg: 'bg-slate-500', text: 'text-white', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: <Activity className="w-4 h-4 mr-1.5" /> };
    }
  };
  
  const statusConfig = getStatusConfig(recoveryCase.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-start space-x-4">
          <Link to="/queue" className="mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                 Case <span className="text-slate-400 font-normal">#{recoveryCase.id.split('-')[0]}</span>
               </h2>
               <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-sm ${statusConfig.badge}`}>
                 {statusConfig.icon} {recoveryCase.status.replace(/_/g, ' ')}
               </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
               <div className="flex items-center text-slate-600 dark:text-slate-400">
                 <User className="w-4 h-4 mr-1.5 opacity-70" />
                 {customer?.email}
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
               <div className="flex items-center font-semibold text-slate-900 dark:text-slate-200">
                 {formatCurrency(recoveryCase.amountAtRisk)}
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
               <div className="flex items-center text-slate-600 dark:text-slate-400">
                 <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                 {new Date(recoveryCase.createdAt).toLocaleString()}
               </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-14 sm:ml-0">
           <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
           </button>
        </div>
      </div>

      {/* Alerts */}
      {executeError && (
        <div className="bg-red-50 border-l-4 border-l-red-500 border-t border-r border-b border-t-red-100 border-r-red-100 border-b-red-100 text-red-800 rounded-r-lg p-5 flex items-start shadow-sm">
          <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
          <div>
            <h4 className="font-bold text-sm text-red-900">Execution Failed</h4>
            <p className="text-sm mt-1 font-medium">{executeError}</p>
          </div>
        </div>
      )}

      {isRecovered && (
        <div className="bg-green-50 border-l-4 border-l-green-500 border-t border-r border-b border-t-green-100 border-r-green-100 border-b-green-100 text-green-800 rounded-r-lg p-5 flex items-start shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-600" />
          <div>
            <h4 className="font-bold text-sm text-green-900">Revenue Successfully Recovered</h4>
            <p className="text-sm mt-1 font-medium">This payment has been fully processed and the case is closed. The funds have been secured.</p>
          </div>
        </div>
      )}
      
      {recoveryCase.status === 'EXECUTING' && (
              <div className="rounded-xl border border-indigo-200 bg-white dark:bg-slate-950 dark:border-indigo-900/30 shadow-sm relative overflow-hidden mb-6">
                 <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/10">
                   <h3 className="font-bold text-lg flex items-center text-indigo-900 dark:text-indigo-400">
                     <Activity className="w-5 h-5 mr-2" />
                     Action in Progress
                   </h3>
                 </div>
                <div className="p-6 space-y-4">
                  <button
                    onClick={() => handleManualAction('STOP_RECOVERY')}
                    disabled={executing}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-12 rounded-xl font-semibold transition-all flex items-center justify-center"
                  >
                    {executing ? 'Executing...' : 'Stop Recovery'}
                  </button>
                </div>
              </div>
            )}

            {recoveryCase.status === 'AWAITING_PAYMENT' && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 border-t border-r border-b border-t-amber-100 border-r-amber-100 border-b-amber-100 text-amber-800 rounded-r-lg p-5 flex items-start shadow-sm">
          <Clock className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <h4 className="font-bold text-sm text-amber-900">Awaiting Customer Action</h4>
            <p className="text-sm mt-1 font-medium">A payment link was successfully sent. We are waiting for the customer to complete the transaction.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          
          {/* AI Decision Engine Card */}
          {recoveryCase.status === 'ESCALATED' && (
  <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden relative">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
        <Cpu className="w-5 h-5 mr-2 text-blue-500" />
        AI Decision Engine
      </h3>
      {latestPrediction && (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
          Model: RecovNet-v2
        </span>
      )}
    </div>
    <div className="p-6">
      {latestPrediction ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-5 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Recovery Probability</div>
                <div className="text-4xl font-black text-blue-700 dark:text-blue-300 tracking-tight">
                  {(parseFloat(latestPrediction.recoveryProbability) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-800 flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-blue-500" strokeDasharray={`${parseFloat(latestPrediction.recoveryProbability) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </div>
            </div>
            <div className="flex-1 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-5 rounded-xl flex flex-col justify-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Recommended Action</div>
              <div className="text-xl font-bold text-purple-900 dark:text-purple-300">
                {latestPrediction.recommendedAction.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          <div className="pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4">Reasoning Matrix</h4>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
              <ul className="space-y-4">
                {JSON.parse(latestPrediction.aiReasoning).map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mr-3 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Cpu className="w-12 h-12 mb-3 text-slate-200 dark:text-slate-800" />
          <p className="font-medium text-slate-500">No ML prediction available for this case yet.</p>
        </div>
      )}
    </div>
  </div>
)}
{recoveryCase.status !== 'ESCALATED' && actions?.length > 0 && (
  <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden relative">
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
        Human Action Taken
      </h3>
    </div>
    <div className="p-6">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        {actions[0].actionType.replace(/_/g, ' ')}
      </p>
    </div>
  </div>
)}

          {/* Policy Validation Card */}
          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
                 <ShieldAlert className="w-5 h-5 mr-2 text-amber-500" />
                 Policy & Guardrails
               </h3>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-5">
                The recommended action has been validated against active merchant guardrails and limits.
              </p>
              
              {actions?.length > 0 ? (
                <div className="flex items-start gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${actions[0].status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                     {actions[0].status === 'FAILED' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Check Result</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                      {actions[0].status === 'FAILED' ? (
                        <span className="text-red-600">ACTION BLOCKED</span>
                      ) : (
                        <span className="text-green-600">ACTION APPROVED</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                      {actions[0].resultMetadata?.policyReason || 'The requested recovery action aligns with all currently active business rules and threshold limits.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-medium text-slate-500">
                   Awaiting policy validation...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Execution & Details */}
        <div className="space-y-6">
          
          {/* Action Execution Cards Conditional on Status */}
            {recoveryCase.status === 'RECOMMENDED' && (
              <div className="rounded-xl border border-blue-200 bg-white dark:bg-slate-950 dark:border-blue-900/30 shadow-sm relative overflow-hidden mb-6">
                 <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">
                   <h3 className="font-bold text-lg flex items-center text-blue-900 dark:text-blue-400">
                     <Cpu className="w-5 h-5 mr-2" />
                     AI Recommendation
                   </h3>
                 </div>
                <div className="p-6 space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommended Action</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {latestPrediction?.recommendedAction?.replace(/_/g, ' ') || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={() => handleManualAction(latestPrediction?.recommendedAction || '')}
                      disabled={executing}
                      className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 h-12 rounded-xl font-bold transition-all flex items-center justify-center shadow-md"
                    >
                      {executing ? (
                        <span className="flex items-center"><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Executing...</span>
                      ) : (
                        <span className="flex items-center">Approve Recommendation</span>
                      )}
                    </button>
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      disabled={executing}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-12 rounded-xl font-semibold transition-all flex items-center justify-center"
                    >
                      Reject Recommendation
                    </button>
                  </div>
                </div>
              </div>
            )}
          {recoveryCase.status === 'ESCALATED' && (
            <div className="rounded-xl border border-amber-200 bg-white dark:bg-slate-950 dark:border-amber-900/30 shadow-sm relative overflow-hidden mb-6">
               <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10">
                 <h3 className="font-bold text-lg flex items-center text-amber-900 dark:text-amber-400">
                   <ShieldAlert className="w-5 h-5 mr-2" />
                   Human Review Required
                 </h3>
               </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-700">
                    <input type="radio" name="action" className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300" checked={selectedAction === 'GENERATE_PAYMENT_LINK'} onChange={() => setSelectedAction('GENERATE_PAYMENT_LINK')} />
                    <span className="ml-3 font-semibold text-sm text-slate-700 dark:text-slate-300">Generate Payment Link</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-700">
                    <input type="radio" name="action" className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300" checked={selectedAction === 'RETRY_PAYMENT'} onChange={() => setSelectedAction('RETRY_PAYMENT')} />
                    <span className="ml-3 font-semibold text-sm text-slate-700 dark:text-slate-300">Retry Payment</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-700">
                    <input type="radio" name="action" className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300" checked={selectedAction === 'CONTACT_CUSTOMER'} onChange={() => setSelectedAction('CONTACT_CUSTOMER')} />
                    <span className="ml-3 font-semibold text-sm text-slate-700 dark:text-slate-300">Contact Customer</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-700">
                    <input type="radio" name="action" className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300" checked={selectedAction === 'STOP_RECOVERY'} onChange={() => setSelectedAction('STOP_RECOVERY')} />
                    <span className="ml-3 font-semibold text-sm text-slate-700 dark:text-slate-300">Stop Recovery</span>
                  </label>
                </div>
                
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (selectedAction === 'CONTACT_CUSTOMER') setContactModalOpen(true);
                      else handleManualAction(selectedAction);
                    }}
                    disabled={!selectedAction || executing}
                    className="w-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 h-12 rounded-xl font-bold transition-all flex items-center justify-center shadow-md"
                  >
                    {executing ? (
                      <span className="flex items-center"><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Executing...</span>
                    ) : (
                      <span className="flex items-center">Approve Action</span>
                    )}
                  </button>
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    disabled={executing}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-12 rounded-xl font-semibold transition-all flex items-center justify-center"
                  >
                    Reject Recommendation
                  </button>
                </div>
              </div>
            </div>
          )}

          {recoveryCase.status === 'AWAITING_PAYMENT' && (
            <div className="rounded-xl border border-indigo-200 bg-white dark:bg-slate-950 dark:border-indigo-900/30 shadow-sm relative overflow-hidden mb-6">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/10">
                 <h3 className="font-bold text-lg flex items-center text-indigo-900 dark:text-indigo-400">
                   <ExternalLink className="w-5 h-5 mr-2" />
                   Payment Link Active
                 </h3>
               </div>
              <div className="p-6 space-y-4">
                {completedActions.map((action: any) => (
                  action.resultMetadata?.paymentLinkUrl && (
                    <a 
                      key={action.id}
                      href={action.resultMetadata.paymentLinkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-indigo-600 text-white hover:bg-indigo-700 h-12 rounded-xl font-bold transition-all flex items-center justify-center shadow-md"
                    >
                      Open Checkout
                    </a>
                  )
                ))}
                <button
                  onClick={() => handleManualAction('STOP_RECOVERY')}
                  disabled={executing}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-12 rounded-xl font-semibold transition-all flex items-center justify-center"
                >
                  {executing ? 'Executing...' : 'Stop Recovery'}
                </button>
              </div>
            </div>
          )}

          {recoveryCase.status === 'RECOVERED' && (
            <div className="rounded-xl border border-green-200 bg-white dark:bg-slate-950 dark:border-green-900/30 shadow-sm relative overflow-hidden mb-6">
               <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
               <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                 <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h3 className="font-bold text-xl text-slate-900 dark:text-white">Payment Recovered</h3>
                 <p className="text-sm text-slate-500">{formatCurrency(recoveryCase.amountAtRisk)} was successfully recovered.</p>
               </div>
            </div>
          )}

          {recoveryCase.status === 'FAILED' && (
            <div className="rounded-xl border border-red-200 bg-white dark:bg-slate-950 dark:border-red-900/30 shadow-sm relative overflow-hidden mb-6">
               <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
               <div className="p-6 space-y-4">
                 <h3 className="font-bold text-lg flex items-center text-red-900 dark:text-red-400">
                   <XCircle className="w-5 h-5 mr-2" />
                   Payment Failed
                 </h3>
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Reason: {recoveryCase.failureReason}</p>
                 <button
                    onClick={() => handleExecute()}
                    disabled={executing}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 rounded-xl font-bold transition-all flex items-center justify-center shadow-md dark:bg-white dark:text-slate-900"
                  >
                    Escalate to Human
                  </button>
               </div>
            </div>
          )}

          {recoveryCase.status === 'STOPPED' && (
            <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm relative overflow-hidden mb-6">
               <div className="absolute top-0 left-0 w-full h-1 bg-slate-500"></div>
               <div className="p-6 space-y-4">
                 <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
                   <XCircle className="w-5 h-5 mr-2 text-slate-500" />
                   Recovery Stopped
                 </h3>
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Recovery operations for this case have been halted.</p>
               </div>
            </div>
          )}

          {/* Timeline Card */}
          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm flex flex-col h-[500px]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
               <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
                 <FileText className="w-5 h-5 mr-2 text-slate-400" />
                 Audit Trail
               </h3>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {auditLogs?.map((log: any, i: number) => {
                  const isLatest = i === 0;
                  return (
                    <div key={log.id} className="relative flex items-start pl-8 group">
                      <div className={`absolute left-0 w-5 h-5 flex items-center justify-center rounded-full border-2 bg-white dark:bg-slate-950 shadow-sm ${
                        isLatest ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                         {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                      </div>
                      
                      <div className={`w-full p-4 rounded-xl border ${
                         isLatest 
                          ? 'border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-900/10' 
                          : 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 group-hover:border-slate-200 transition-colors'
                      }`}>
                        <div className={`font-semibold text-sm mb-1 ${isLatest ? 'text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      {contactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contact Customer</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Email</label>
                <input type="text" readOnly value={customer?.email} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Details</label>
                <p className="text-sm text-slate-500">Reach out to the customer regarding their failed payment of {formatCurrency(recoveryCase.amountAtRisk)}.</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <button onClick={() => handleManualAction('GENERATE_PAYMENT_LINK')} disabled={executing} className="w-full py-2.5 bg-[#0B1220] text-white rounded-lg font-semibold text-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900">Generate Payment Link</button>
              <button onClick={() => handleManualAction('CONTACT_CUSTOMER')} disabled={executing} className="w-full py-2.5 bg-slate-200 text-slate-800 rounded-lg font-semibold text-sm hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">Mark Outreach Sent</button>
              <button onClick={() => setContactModalOpen(false)} disabled={executing} className="w-full py-2.5 bg-transparent text-slate-500 rounded-lg font-semibold text-sm hover:text-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reject AI Recommendation?</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason (Optional)</label>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:outline-none min-h-[100px]" 
                  placeholder="Why are you rejecting this recommendation?"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setRejectModalOpen(false)} disabled={executing} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm">Cancel</button>
              <button onClick={() => handleManualAction('REJECT_RECOMMENDATION', rejectReason)} disabled={executing} className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg font-semibold text-sm flex items-center">{executing ? 'Executing...' : 'Confirm Rejection'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
