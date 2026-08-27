import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Truck,
  Receipt,
  FileSignature,
  BarChart3,
  BookText,
} from 'lucide-react';
import appLogo from '../assets/notapedialogo.png';

const menus = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/client', label: 'Client', icon: Users },
  { to: '/po', label: 'Purchase Order', icon: FileText },
  { to: '/surat-jalan', label: 'Surat Jalan', icon: Truck },
  { to: '/invoice', label: 'Invoice', icon: Receipt },
  { to: '/tanda-terima', label: 'Tanda Terima', icon: FileSignature },
  { to: '/laporan', label: 'Laporan', icon: BarChart3 },
  { to: '/riwayat', label: 'Riwayat PO', icon: BookText },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-200">
        <img src={appLogo} alt="Notapedia" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
        <div>
          <div className="text-base font-bold text-slate-900 leading-none">Notapedia</div>
          <div className="text-[10px] text-slate-500 mt-0.5">PO · SJ · Invoice</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menus.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <m.icon className="h-4 w-4" />
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500">
        v1.0 · Offline mode
      </div>
    </aside>
  );
}
