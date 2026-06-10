// Central error reporter. Forwards to Sentry, which is dormant (a no-op) until a
// DSN is configured — so this is safe to call everywhere. Never throws.
import * as Sentry from "@sentry/nextjs";

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* a failing reporter must never break the app */
  }
}
