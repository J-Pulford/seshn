// Next.js instrumentation hook. Loads the right Sentry config per runtime and
// wires server-side request errors (Server Components, route handlers) into
// Sentry. All dormant until a DSN is set.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
