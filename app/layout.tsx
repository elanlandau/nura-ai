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

const baseUrl =
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT ?? '3000'}`);

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'NURA - AI Personal Assistant',
  description: 'Your intelligent scheduling assistant',
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" suppressHydrationWarning>
      <body className={`${inter.className} bg-[var(--bg)] text-[var(--text-primary)] antialiased`} style={{ letterSpacing: '0.02em' }}>
        <SupabaseProvider>
          <AuthGuard>{children}</AuthGuard>
        </SupabaseProvider>
      </body>
    </html>
  );
}
