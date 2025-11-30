import { AlertCircle, RefreshCw } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/shared/ui/Button';

interface StorageUnavailableWarningProps {
  error?: string;
  isRetrying?: boolean;
  onRetry: () => void;
}

export const StorageUnavailableWarning = memo(
  function StorageUnavailableWarning({
    error,
    isRetrying = false,
    onRetry,
  }: StorageUnavailableWarningProps) {
    return (
      <div className="flex flex-1 h-full w-full max-w-screen-2xl mx-auto overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-destructive/10 border border-destructive/20 rounded-lg p-8">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="rounded-full bg-destructive/20 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-destructive mb-3">
                  Storage Unavailable
                </h2>
                <p className="text-muted-foreground mb-2">
                  Your S3-compatible storage is currently not accessible. This
                  could be due to:
                </p>
                <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1 mb-4">
                  <li>Network connectivity issues</li>
                  <li>Invalid or expired credentials</li>
                  <li>Storage service being temporarily down</li>
                  <li>Incorrect storage configuration</li>
                </ul>
                {error && (
                  <p className="text-sm text-destructive/80 bg-destructive/5 rounded p-3 mb-4">
                    Error: {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={onRetry} disabled={isRetrying} size="lg">
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Connection
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Please check your storage configuration or contact your
                administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
