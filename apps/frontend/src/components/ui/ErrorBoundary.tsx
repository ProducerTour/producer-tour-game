/**
 * Error Boundary Components
 * Using react-error-boundary for graceful error handling
 */

import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './Button';

// Default Error Fallback Component
function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-text-secondary mb-6">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (collapsible in dev) */}
        {import.meta.env.DEV && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
              Error Details
            </summary>
            <pre className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={resetErrorBoundary} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/dashboard')}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact Error Fallback (for smaller sections)
function CompactErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <Bug className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white mb-1">Failed to load</h3>
          <p className="text-xs text-gray-400 mb-3">
            {import.meta.env.DEV ? error.message : 'An error occurred while loading this section.'}
          </p>
          <Button size="sm" variant="ghost" onClick={resetErrorBoundary}>
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// Full Page Error Fallback
function FullPageErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full">
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-8 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-white mb-3">Application Error</h1>
          <p className="text-text-secondary mb-6">
            We're sorry, but something went wrong. Our team has been notified and is working on a fix.
          </p>

          {/* Error Details */}
          {import.meta.env.DEV && (
            <details className="mb-6 text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                Developer Info
              </summary>
              <pre className="p-4 rounded-xl bg-surface text-xs text-gray-400 overflow-auto max-h-48 border border-white/10">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={resetErrorBoundary} className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="flex-1 sm:flex-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@producertour.com" className="text-blue-400 hover:text-blue-300">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

// Error Logging Function
function logError(error: Error, info: { componentStack?: string | null }) {
  // Log to console in development
  console.error('Error caught by ErrorBoundary:', error);
  if (info.componentStack) {
    console.error('Component stack:', info.componentStack);
  }

  // In production, you would send this to an error tracking service
  // e.g., Sentry, LogRocket, Bugsnag
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { extra: info });
  // }
}

// Wrapper Components
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: 'default' | 'compact' | 'fullPage';
  onReset?: () => void;
}

function ErrorBoundary({ children, fallback = 'default', onReset }: ErrorBoundaryProps) {
  const FallbackComponent =
    fallback === 'compact'
      ? CompactErrorFallback
      : fallback === 'fullPage'
      ? FullPageErrorFallback
      : DefaultErrorFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={logError}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Async Error Boundary (for Suspense-based data fetching)
interface AsyncBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: 'default' | 'compact';
}

function AsyncBoundary({ children, errorFallback = 'compact' }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  );
}

export {
  ErrorBoundary,
  AsyncBoundary,
  DefaultErrorFallback,
  CompactErrorFallback,
  FullPageErrorFallback,
  logError,
};
