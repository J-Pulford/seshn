// Promise-based confirm/prompt dialog. Like toast, it's driven by a window
// event so any client code can `await confirmDialog(...)` without context
// wiring; the <ConfirmHost/> in the root layout renders the modal and resolves
// the promise. Replaces native window.confirm()/window.prompt().
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Show a text field and return its value on confirm. */
  prompt?: boolean;
  promptLabel?: string;
  promptPlaceholder?: string;
  defaultValue?: string;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireText?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  value?: string;
}

export interface ConfirmEventDetail {
  opts: ConfirmOptions;
  resolve: (result: ConfirmResult) => void;
}

export function confirmDialog(opts: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ confirmed: false });
      return;
    }
    window.dispatchEvent(new CustomEvent<ConfirmEventDetail>("seshn:confirm", { detail: { opts, resolve } }));
  });
}

/** Convenience: just the boolean. */
export async function confirm(opts: ConfirmOptions): Promise<boolean> {
  return (await confirmDialog(opts)).confirmed;
}
