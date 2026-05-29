import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/Wordmark";
import { Mark } from "@/components/brand/Mark";
import {
  ReceiptBird,
  CitrusCalc,
  CoinStones,
  StampMoth,
  InkwellTide,
} from "@/components/brand/illustrations";
import { t } from "@/lib/i18n.server";

export default function LandingPage() {
  return (
    <div className="bg-paper-grain text-ink">
      {/* TOP BAR - logo + sign-in entry point */}
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto py-4 px-6 lg:px-12 flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Mark size={28} />
            <Wordmark size={0.7} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                {t("Sign In")}
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden sm:inline-flex">
              <Button variant="clay" size="sm">
                {t("Get Started")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 px-6 lg:px-12 pt-16 pb-24 max-w-7xl mx-auto items-center">
        <div>
          <div className="cap text-ink-mute mb-5">{t("landing.eyebrow")}</div>
          <h1 className="font-display text-[64px] md:text-[96px] leading-[0.98] tracking-[-0.025em] m-0">
            {t("landing.heroLineA")} <em>{t("landing.heroEm1")}</em>,
            <br />
            {t("landing.heroLineB")} <em>{t("landing.heroEm2")}</em>.
          </h1>
          <p className="text-[19px] text-ink-2 mt-7 leading-[1.55] max-w-[520px]">
            {t("landing.heroSub")}
          </p>
          <div className="flex flex-wrap gap-3.5 mt-9">
            <Link href="/sign-up">
              <Button variant="clay" size="lg">
                {t("landing.ctaPrimary")}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                {t("landing.ctaSecondary")}
              </Button>
            </Link>
          </div>
          <ul className="flex flex-wrap gap-7 mt-9 text-xs text-ink-3 list-none p-0">
            <li>★ {t("landing.heroBullet1")}</li>
            <li>★ {t("landing.heroBullet2")}</li>
            <li>★ {t("landing.heroBullet3")}</li>
            <li>★ {t("landing.heroBullet4")}</li>
          </ul>
        </div>
        <div className="relative h-[480px] hidden lg:block">
          <ReceiptBird size={300} className="absolute top-0 right-0" />
          <CitrusCalc size={240} className="absolute bottom-5 left-2" />
          <CoinStones size={180} className="absolute top-[200px] right-[100px]" />
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="bg-ink text-paper py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="cap text-ink-mute mb-5">{t("landing.manifestoEyebrow")}</div>
          <p className="font-display text-[40px] md:text-[56px] leading-[1.1] tracking-[-0.015em] m-0 max-w-[1000px]">
            {t("landing.manifestoA")}{" "}
            <em className="text-sun">{t("landing.manifestoEm")}</em>
            {t("landing.manifestoB")}
          </p>
        </div>
      </section>

      {/* THREE VALUES */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-b border-ink/10 max-w-7xl mx-auto">
        {[
          { I: StampMoth, title: t("landing.value1Title"), body: t("landing.value1Body") },
          {
            I: InkwellTide,
            title: t("landing.value2Title"),
            body: t("landing.value2Body"),
            highlight: true,
          },
          { I: CoinStones, title: t("landing.value3Title"), body: t("landing.value3Body") },
        ].map(({ I, title, body, highlight }, i) => (
          <div
            key={i}
            className={[
              "p-9",
              i < 2 ? "md:border-r border-ink/10" : "",
              highlight ? "bg-paper-2" : "",
            ].join(" ")}
          >
            <I size={140} />
            <h3 className="font-display text-[28px] m-0 mt-5 leading-[1.1]">{title}</h3>
            <p className="text-sm text-ink-2 leading-[1.6] mt-2.5 m-0">{body}</p>
          </div>
        ))}
      </section>

      {/* EHF / PEPPOL */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-6 lg:px-12 py-20 items-center max-w-7xl mx-auto">
        <div>
          <div className="cap text-clay mb-4">{t("landing.ehfEyebrow")}</div>
          <h2 className="font-display text-[40px] md:text-[56px] leading-[1.05] tracking-[-0.02em] m-0">
            {t("landing.ehfQuote")}
          </h2>
          <p className="text-base text-ink-2 mt-5 leading-[1.6] max-w-[520px]">
            {t("landing.ehfBody")}
          </p>
        </div>
        <div className="flex justify-center">
          <StampMoth size={400} />
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 lg:px-12 py-24 border-t border-ink/10 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="cap text-ink-mute mb-3.5">{t("landing.pricingEyebrow")}</div>
          <h2 className="font-display text-[44px] md:text-[64px] m-0 tracking-[-0.02em]">
            {t("landing.pricingTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: t("pricing.tier1"),
              price: "49",
              unit: t("pricing.unit1"),
              note: t("pricing.note1"),
              btn: t("pricing.btn1"),
            },
            {
              name: t("pricing.tier2"),
              price: "89",
              unit: t("pricing.unit2"),
              note: t("pricing.note2"),
              btn: t("pricing.btn2"),
            },
            {
              name: t("pricing.tier3"),
              price: "199",
              unit: t("pricing.unit3"),
              note: t("pricing.note3"),
              btn: t("pricing.btn3"),
              best: true,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={[
                "p-8 border border-ink/10 relative",
                p.best ? "bg-ink text-paper" : "bg-paper-2 text-ink",
              ].join(" ")}
            >
              {p.best && (
                <div className="cap absolute top-5 right-5 text-sun">
                  {t("pricing.best")}
                </div>
              )}
              <div className="font-display text-[28px]">{p.name}</div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="font-display text-[72px] leading-none tracking-[-0.02em]">
                  {p.price}
                </span>
                <span className={p.best ? "text-sm text-ink-mute" : "text-sm text-ink-3"}>
                  {p.unit}
                </span>
              </div>
              <p
                className={[
                  "text-sm mt-3.5 leading-[1.5]",
                  p.best ? "text-paper-2/70" : "text-ink-2",
                ].join(" ")}
              >
                {p.note}
              </p>
              <Link href="/pricing">
                <Button
                  variant={p.best ? "clay" : "default"}
                  size="default"
                  className="mt-5 w-full"
                >
                  {p.btn}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-ink-3 mt-10">
          {t("pricing.freeNote")}
        </p>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink text-ink-mute px-6 lg:px-12 py-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <Wordmark size={1.4} inverted />
          <div className="mt-3 text-xs">{t("footer.tagline")}</div>
        </div>
        <div className="text-xs flex flex-col items-start md:items-end gap-2">
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-paper transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-paper transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/status" className="hover:text-paper transition-colors">
              {t("footer.status")}
            </Link>
          </div>
          <span>AIAKAKI · Org.nr 937 074 212</span>
        </div>
      </footer>
    </div>
  );
}
