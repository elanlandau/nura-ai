'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

function getTimeOfDayGreeting(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

type WeatherPayload = {
  line: string;
  city: string;
  tempC: number;
  description: string;
};

type TaskRow = {
  id: string;
  title: string;
  due_at: string;
};

const RULE = 'border-[#E5E5E5]';

export default function HomePage() {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const metaName = user?.name ?? user?.email?.split('@')[0] ?? 'there';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWeatherLoading(true);
      try {
        const r = await fetch('/api/weather');
        const data = (await r.json()) as WeatherPayload;
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setTasksLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, profileRes] = await Promise.all([
          fetch(`/api/tasks/list?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/user/chat-profile?userId=${encodeURIComponent(userId)}`),
        ]);
        if (cancelled) return;
        if (tasksRes.ok) {
          const d = (await tasksRes.json()) as { tasks?: TaskRow[] };
          setTasks(Array.isArray(d.tasks) ? d.tasks : []);
        }
        if (profileRes.ok) {
          const p = (await profileRes.json()) as { display_name?: string | null };
          if (p.display_name?.trim()) setDisplayName(p.display_name.trim());
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const greeting = getTimeOfDayGreeting();
  const name = displayName ?? metaName;

  return (
    <div className="min-h-full w-full text-black">
      <div className="w-full space-y-0">
        <div className={`pb-16 md:pb-24 border-b ${RULE}`}>
          {weatherLoading ? (
            <p className="text-[11px] text-black/40 leading-relaxed tracking-wide flex items-center gap-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Atmosphere
            </p>
          ) : weather ? (
            <p className="text-[11px] leading-relaxed text-black/70 tracking-wide max-w-prose">{weather.line}</p>
          ) : (
            <p className="text-[11px] leading-relaxed text-black/35">Atmosphere unavailable.</p>
          )}
        </div>

        <div className={`pt-16 md:pt-24 pb-16 md:pb-24 border-b ${RULE}`}>
          <h1 className="gallery-heading text-5xl sm:text-6xl text-black leading-[1.05]">
            Good {greeting}, {name}.
          </h1>
          <p className="mt-10 text-[11px] leading-relaxed text-black/45 max-w-md tracking-wide">
            Today&apos;s briefing. Nothing here is a widget—only type and line.
          </p>
        </div>

        <div className={`pt-16 md:pt-24`}>
          <div className={`flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-6 pb-10 border-b ${RULE}`}>
            <span className="text-[9px] uppercase tracking-[0.35em] text-black/40">Tasks</span>
            <Link
              href="/tasks"
              className="text-[9px] uppercase tracking-[0.25em] text-black/40 hover:text-black transition-colors shrink-0"
            >
              View all
            </Link>
          </div>

          {tasksLoading ? (
            <div className="flex items-center gap-3 text-[11px] text-black/40 py-16 leading-relaxed">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Retrieving tasks
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-black/45 py-16 max-w-md">
              No tasks. Speak with Nura to add commitments; they will appear here as plain text.
            </p>
          ) : (
            <ul className="mt-0">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className={`py-10 md:py-12 border-b ${RULE} last:border-b-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4`}
                >
                  <span className="text-[11px] leading-relaxed text-black font-normal">{t.title}</span>
                  <time className="text-[10px] text-black/35 shrink-0 tabular-nums tracking-wide">
                    {format(new Date(t.due_at), 'MMM d, yyyy · HH:mm')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
