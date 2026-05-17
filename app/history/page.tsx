import { HistoryClient } from '@/components/history/HistoryClient';
import { History } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  return (
    <div>
      <div className="page-header px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Search &amp; History</h1>
            <p className="text-sm text-muted-foreground">
              Search documents by work order, machine, shift, or status
            </p>
          </div>
        </div>
      </div>
      <div className="page-content">
        <HistoryClient />
      </div>
    </div>
  );
}
