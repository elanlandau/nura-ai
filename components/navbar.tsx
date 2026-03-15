'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Link2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="h-8 w-8" />
            <span className="text-2xl font-bold">NURA</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>
            <Link
              href="/connections"
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                pathname === '/connections' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Link2 className="h-4 w-4" />
              Connections
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
