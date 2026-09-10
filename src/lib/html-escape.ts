/**
 * Escapes text for safe interpolation into an HTML email body. Several
 * notification emails (src/server/notifications.ts) embed user-controlled
 * strings — names, a free-text decline reason, a direct message between
 * members — directly into an HTML template; without this, one member could
 * inject markup/links into an email sent to another member or to an admin.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
