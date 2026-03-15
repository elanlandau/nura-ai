'use client';

import { Menu } from 'lucide-react';
import { useMobileSidebar } from '@/components/mobile-sidebar-context';
import { Button } from '@/components/ui/button';

export function MobileMenuButton() {
  const { toggle } = useMobileSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="md:hidden shrink-0 rounded-lg text-[var(--text-primary)] hover:bg-[var(--coral-soft)] hover:text-[var(--coral)]"
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
}
