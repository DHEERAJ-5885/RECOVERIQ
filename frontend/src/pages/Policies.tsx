import { ShieldAlert, ShieldCheck, Plus, Filter, ToggleRight, AlertTriangle, Lock, Zap, Ban, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

type PolicyTab = 'All Policies' | 'Active' | 'Guardrails' | 'Limits';

interface PolicyRule {
  name: string;
  type: string;
  scope: string;
  description: string;
  isActive: boolean;
  icon: typeof ShieldCheck;
}

export function Policies() {
  const [activeTab, setActiveTab] = useState<PolicyTab>('All Policies');
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/policies')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((p: any) => ({
          name: p.name,
          type: p.conditionLogic?.type || 'Policy',
          scope: p.conditionLogic?.scope || 'All',
          description: p.description,
          isActive: p.isActive,
          icon: p.conditionLogic?.type === 'Guardrail' ? ShieldAlert : ShieldCheck,
        }));
        setPolicies(mapped);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const tabs: PolicyTab[] = ['All Policies', 'Active', 'Guardrails', 'Limits'];

  const filteredPolicies = policies.filter((p) => {
    if (activeTab === 'All Policies') return true;
    if (activeTab === 'Active') return p.isActive;
    if (activeTab === 'Guardrails') return p.type === 'Guardrail';
    if (activeTab === 'Limits') return p.type === 'Policy';
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Policies & Guardrails
          </h2>
          <p className="text-slate-500 mt-1">
            Configure rules and guardrails for AI-driven recovery actions.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Policy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Policy Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Policy Name</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Type</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Scope</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Description</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPolicies.map((policy, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          policy.isActive
                            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <policy.icon
                          className={`w-4 h-4 ${
                            policy.isActive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {policy.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        policy.type === 'Guardrail'
                          ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {policy.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                    {policy.scope}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-xs">
                    {policy.description}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        policy.isActive
                          ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          policy.isActive ? 'bg-green-500' : 'bg-slate-400'
                        }`}
                      ></span>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {policies.filter((p) => p.isActive).length}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Rules
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {policies.filter((p) => p.type === 'Guardrail').length}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Guardrails
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {policies.filter((p) => p.type === 'Policy').length}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Policies
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
