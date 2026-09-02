import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, AlertCircle, ListTodo, FileWarning, ScrollText, BarChart, ShieldAlert, Settings, Bell, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DemoModeIndicator } from '@/components/DemoModeIndicator'

const navItems = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Revenue at Risk', href: '/risk', icon: AlertCircle },
  { name: 'Recovery Queue', href: '/queue', icon: ListTodo },
  { name: 'Policies & Guardrails', href: '/policies', icon: ShieldAlert },
  { name: 'Escalations', href: '/escalations', icon: FileWarning },
  { name: 'Audit Trail', href: '/audit', icon: ScrollText },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
]

export function DashboardLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Sidebar - Dark Navy */}
      <div className="hidden w-[260px] flex-col overflow-y-auto bg-[#0B1220] md:flex">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 font-bold text-white shadow-sm">
              R
            </div>
            <span className="text-xl font-semibold tracking-tight">RecoverIQ</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-6">
          <div className="mb-4 text-xs font-semibold tracking-wider text-slate-500 px-3 uppercase">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-300',
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 mt-auto border-t border-white/10 space-y-1">
          <Link
            to="#"
            className="group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Settings className="mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-300" />
            Settings
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 dark:bg-slate-950 dark:border-slate-800 z-10 shadow-sm">
          <div className="flex items-center">
             <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:hidden mr-4">RecoverIQ</span>
             
             <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
               <Search className="h-4 w-4 text-slate-400 mr-2" />
               <input type="text" placeholder="Search cases..." className="bg-transparent border-none outline-none text-sm w-48 text-slate-600 placeholder:text-slate-400" />
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <DemoModeIndicator />
            
            <div className="flex items-center gap-4 border-l pl-6 border-slate-200">
              <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute 0 right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-700">Admin User</span>
                  <span className="text-xs text-slate-500">Demo Account</span>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 overflow-hidden">
                   <User className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
