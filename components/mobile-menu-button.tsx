'use client';

import { useMobileSidebar } from '@/components/mobile-sidebar-context';

export function MobileMenuButton() {
  const { toggle } = useMobileSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      className="md:hidden shrink-0 text-[9px] uppercase tracking-[0.3em] text-black/50 hover:text-black border-0 border-b border-black bg-transparent px-0 py-2"
      aria-label="Open menu"
    >
      Menu
    </button>
  );
}
