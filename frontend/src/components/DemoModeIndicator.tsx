export function DemoModeIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold tracking-wider text-orange-600 uppercase shadow-sm">
      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></div>
      DEMO / TEST MODE
    </div>
  );
}
