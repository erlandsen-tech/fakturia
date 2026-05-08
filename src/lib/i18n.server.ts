import { cookies } from "next/headers";
import { t as base, type Locale } from "./i18n";

/**
 * Server-side translator. Reads the locale cookie per-request.
 * Use from server components: `import { t } from "@/lib/i18n.server"`.
 */
export function t(key: string): string {
  const store = cookies();
  const locale = (store.get("locale")?.value ?? "nb") as Locale;
  return base(key, locale);
}
