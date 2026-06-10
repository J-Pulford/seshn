import * as Sentry from "@sentry/nextjs";

// Node.js server runtime. Dormant when SENTRY_DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
});
