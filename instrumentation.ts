import * as Sentry from "@sentry/nextjs";

// Server-side registration hook: load the right Sentry config per runtime, and
// wire server request errors (Server Components, route handlers) into Sentry.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
