import { Search, Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 max-w-md flex-1">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No PO, No SJ, No Invoice, atau nama client..."
            className="input pl-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-800 leading-none">Admin</div>
            <div className="text-[11px] text-slate-500 mt-0.5">admin@notapedia</div>
          </div>
        </div>
      </div>
    </header>
  );
}
