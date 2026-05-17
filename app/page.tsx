import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getDashboardStats, getShiftProduction, getMachineProduction } from '@/lib/services/analytics';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { WeeklyTrendChart } from '@/components/dashboard/WeeklyTrendChart';
import { ShiftChart } from '@/components/dashboard/ShiftChart';
import { MachineChart } from '@/components/dashboard/MachineChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatCardSkeleton } from '@/components/shared/Skeleton';
import { Activity, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function DashboardData() {
  const [stats, shiftProduction, machineProduction, recentLogs] = await Promise.all([
    getDashboardStats(),
    getShiftProduction(),
    getMachineProduction(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { document: { select: { originalName: true, status: true } } },
    }),
  ]);

  return (
    <>
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <WeeklyTrendChart data={stats.weeklyTrend} />
        </div>
        <ShiftChart data={shiftProduction} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MachineChart data={machineProduction} />
        </div>
        <RecentActivity logs={recentLogs} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="page-header px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Operations Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time manufacturing workflow overview
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <DashboardData />
        </Suspense>
      </div>
    </div>
  );
}
