"use client";
import { useTransition } from "react";
import { useLocale } from "@/lib/i18n";

export function LocaleSwitcher() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  function set(next: "nb" | "en") {
    start(() => {
      document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
      location.reload();
    });
  }
  return (
    <div className="flex gap-2 text-xs font-mono text-ink-3">
      <button
        onClick={() => set("nb")}
        disabled={locale === "nb" || pending}
        className={locale === "nb" ? "text-ink underline" : ""}
      >
        NB
      </button>
      <span>·</span>
      <button
        onClick={() => set("en")}
        disabled={locale === "en" || pending}
        className={locale === "en" ? "text-ink underline" : ""}
      >
        EN
      </button>
    </div>
  );
}
