/** `sendEmail` → `send-email`, `Email templates` → `email-templates`: API reference URL segments. */
export function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
