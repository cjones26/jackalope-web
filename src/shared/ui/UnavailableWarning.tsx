import { AlertCircle, RefreshCw } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/shared/ui/Button';

interface UnavailableWarningProps {
  title: string;
  description: string;
  reasons?: string[];
  error?: string;
  isRetrying?: boolean;
  onRetry: () => void;
  helpText?: string;
}

export const UnavailableWarning = memo(
  function UnavailableWarning({
    title,
    description,
    reasons,
    error,
    isRetrying = false,
    onRetry,
    helpText,
  }: UnavailableWarningProps) {
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
                  {title}
                </h2>
                <p className="text-muted-foreground mb-2">
                  {description}
                </p>
                {reasons && reasons.length > 0 && (
                  <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1 mb-4">
                    {reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}
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
                      Retry
                    </>
                  )}
                </Button>
              </div>

              {helpText && (
                <p className="text-xs text-muted-foreground">
                  {helpText}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
