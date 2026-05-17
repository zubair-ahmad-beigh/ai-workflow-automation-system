'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  BarChart3,
  History,
  Factory,
  Settings,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/review', label: 'Review Queue', icon: ClipboardList },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card h-screen overflow-hidden">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">ManufactureFlow</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">AI Workflow System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn('nav-item', isActive && 'nav-item-active')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {href === '/review' && (
                <ReviewBadge />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Factory className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Production Floor</p>
            <p className="text-[10px] text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Live review queue count badge
function ReviewBadge() {
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-400">
      !
    </span>
  );
}
