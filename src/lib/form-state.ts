import type { ZodError } from "zod";

/**
 * Shared shape for useActionState-driven forms across the app: a
 * general-purpose error message plus per-field messages from zod, and a
 * `success` flag for actions that redirect (redirect() throws internally so
 * a caller can't return a value after it — success is only ever seen when
 * the action intentionally returns instead of redirecting).
 */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export const initialActionState: ActionState = {};

export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
