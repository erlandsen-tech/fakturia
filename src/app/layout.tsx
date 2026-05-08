import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/navbar";
import { LocaleProvider, type Locale } from "@/lib/i18n";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fakturio — fakturering for folk som heller vil gjøre noe annet",
  description:
    "Et fakturaverktøy for norske enkeltpersonforetak. Vennlig, varmt, og gjort på 60 sekunder.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (cookies().get("locale")?.value ?? "nb") as Locale;

  return (
    <html
      lang={locale === "en" ? "en" : "nb-NO"}
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-paper text-ink">
        <LocaleProvider value={locale}>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster
            toastOptions={{
              className:
                "!bg-ink !text-paper !border-0 !rounded-sm !shadow-lift font-sans",
            }}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
