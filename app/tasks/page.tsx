'use client';

import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 sm:p-8 md:p-10 max-w-3xl w-full mx-auto">
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--teal-soft)] flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-[var(--teal)]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">משימות</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            ניהול רשימת משימות מתוך Gmail ו־Calendar. המשימות שנורה סרקה יופיעו כאן.
          </p>
        </div>

        <div className="glass-pod rounded-[var(--radius-salon)] p-8 sm:p-10">
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            עדיין לא סוננו משימות. דברו עם נורה בצ׳אט כדי לסרוק מיילים ואירועים ולבנות רשימה.
          </p>
        </div>
      </div>
    </div>
  );
}
