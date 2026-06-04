// Lightweight global toasts. Fires a window CustomEvent that the <Toaster/>
// mounted in the root layout renders — so any client code can call toast.*()
// without context wiring (same pattern as seshn:profile-updated). Replaces the
// jarring native alert() popups.
export type ToastKind = "success" | "error" | "info";

export interface ToastDetail {
  message: string;
  kind: ToastKind;
  duration?: number;
}

export function showToast(message: string, opts: { kind?: ToastKind; duration?: number } = {}) {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("seshn:toast", {
      detail: { message, kind: opts.kind || "info", duration: opts.duration },
    }),
  );
}

export const toast = {
  success: (message: string, duration?: number) => showToast(message, { kind: "success", duration }),
  error: (message: string, duration?: number) => showToast(message, { kind: "error", duration }),
  info: (message: string, duration?: number) => showToast(message, { kind: "info", duration }),
};
