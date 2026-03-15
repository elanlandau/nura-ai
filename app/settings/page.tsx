'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, Globe, Link2, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const [lang, setLang] = useState<'he' | 'en'>('he');

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 sm:p-8 md:p-10 max-w-3xl w-full mx-auto">
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--teal-soft)] flex items-center justify-center">
              <Settings className="h-5 w-5 text-[var(--teal)]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">הגדרות</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            שפה והרשאות. חיבור חשבונות מאפשר לנורה לגשת ל־Calendar ו־Gmail.
          </p>
        </div>

        <div className="space-y-6">
          <section className="glass-pod rounded-[var(--radius-salon)] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="px-6 py-4 flex items-center gap-3">
              <Globe className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">שפה</span>
            </div>
            <div className="p-6 pt-0 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setLang('he')}
                className={`px-5 py-2.5 rounded-[var(--radius-salon)] text-sm font-medium transition-[var(--transition-lux)] ${
                  lang === 'he'
                    ? 'bg-[var(--coral)] text-white'
                    : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--coral)] hover:bg-[var(--coral-soft)]'
                }`}
                style={lang === 'he' ? { boxShadow: 'var(--coral-glow)' } : undefined}
              >
                עברית
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-5 py-2.5 rounded-[var(--radius-salon)] text-sm font-medium transition-[var(--transition-lux)] ${
                  lang === 'en'
                    ? 'bg-[var(--coral)] text-white'
                    : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--coral)] hover:bg-[var(--coral-soft)]'
                }`}
                style={lang === 'en' ? { boxShadow: 'var(--coral-glow)' } : undefined}
              >
                English
              </button>
            </div>
          </section>

          <section className="glass-pod rounded-[var(--radius-salon)] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
            <Link
              href="/connections"
              className="flex items-center justify-between px-6 py-5 gap-4 text-left hover:bg-black/[0.03] transition-[var(--transition-lux)]"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-[var(--teal-soft)] flex items-center justify-center shrink-0">
                  <Link2 className="h-5 w-5 text-[var(--teal)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">חיבורים</p>
                  <p className="text-xs text-[var(--text-muted)]">Google, Microsoft – Calendar ומייל</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
