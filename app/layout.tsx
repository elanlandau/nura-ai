import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SupabaseProvider } from '@/lib/supabase/provider';
import { AuthGuard } from '@/components/auth-guard';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-salon',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const baseUrl = 'https://nurapersonal.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'NURA - AI Executive Assistant',
  description: 'Your intelligent AI executive assistant',
  openGraph: {
    images: [{ url: `${baseUrl}/og.png` }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: `${baseUrl}/og.png` }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#FCFAF7] text-black antialiased text-[14px] leading-relaxed tracking-wide`}
      >
        <SupabaseProvider>
          <AuthGuard>{children}</AuthGuard>
        </SupabaseProvider>
      </body>
    </html>
  );
}
