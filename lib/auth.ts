import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { sendEmail, buildWelcomeEmail } from '@/lib/resend';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      authorization: {
        params: {
          scope: 'openid email profile offline_access Calendars.ReadWrite Mail.ReadWrite Mail.Send',
        },
      },
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Send welcome email on first account creation (if Resend key is set)
      if (user.email && process.env.RESEND_API_KEY) {
        try {
          const { subject, html, text } = buildWelcomeEmail(user.name ?? '');
          await sendEmail({ to: user.email, subject, html, text });
        } catch (e) {
          // Non-fatal: log but don't block sign-in
          console.error('[auth] welcome email failed:', e instanceof Error ? e.message : e);
        }
      }
    },
  },
};
