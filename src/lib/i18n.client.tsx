"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./i18n";

const LocaleContext = createContext<Locale>("nb");

export function LocaleProvider({
  value,
  children,
}: {
  value: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
