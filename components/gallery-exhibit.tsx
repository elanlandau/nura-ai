'use client';

import { usePathname } from 'next/navigation';

/**
 * Standalone exhibit: vertically & horizontally centered column, strict max width.
 * Chat uses fill-height so the conversation can occupy the viewport inside the column.
 */
export function GalleryExhibit({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === '/chat' || pathname.startsWith('/chat/');

  if (isChat) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center overflow-hidden">
        <div className="w-full max-w-[800px] flex-1 flex flex-col min-h-0 px-6 md:px-10 py-12 md:py-16">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center px-6 md:px-12 py-24 md:py-40">
        <div className="w-full max-w-[800px] my-auto">{children}</div>
      </div>
    </div>
  );
}
