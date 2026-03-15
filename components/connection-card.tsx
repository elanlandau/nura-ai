'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { OAuthAccount } from '@/lib/types';

interface ConnectionCardProps {
  provider: 'google' | 'microsoft';
  title: string;
  description: string;
  icon: React.ReactNode;
  account: OAuthAccount | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectionCard({
  provider,
  title,
  description,
  icon,
  account,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await onConnect();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-pod rounded-[var(--radius-salon)] border-0 transition-[var(--transition-lux)]">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-2xl overflow-hidden bg-[var(--bg)] flex items-center justify-center p-1.5">{icon}</div>
            <div>
              <CardTitle className="text-[var(--text-primary)]">{title}</CardTitle>
              <CardDescription className="text-[var(--text-muted)]">{description}</CardDescription>
            </div>
          </div>
          {account ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--mint)] shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-[var(--text-muted)]/50 shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        {account ? (
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Connected as:</span>
              <br />
              <span className="font-medium text-[var(--text-primary)]">{account.email}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full rounded-[var(--radius-salon)] bg-[var(--bg)] border-0 text-[var(--text-muted)] hover:bg-[var(--coral-soft)] hover:text-[var(--coral)] transition-[var(--transition-lux)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full rounded-[var(--radius-salon)] bg-[var(--coral)] hover:bg-[var(--coral)]/90 text-white border-0 transition-[var(--transition-lux)]"
            style={{ boxShadow: 'var(--coral-glow)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
