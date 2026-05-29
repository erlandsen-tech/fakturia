import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status · Fakturio",
  description: "Driftsstatus for Fakturio.",
};

const CONTACT = "hei@fakturio.no";
const UPDATED = "29. mai 2026";

export default function StatusPage() {
  return (
    <div className="bg-paper-grain text-ink min-h-screen">
      <article className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <Link href="/" className="cap text-ink-mute hover:text-ink transition-colors">
          Fakturio
        </Link>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[1.05] tracking-[-0.02em] mt-6 mb-2">
          Status
        </h1>
        <p className="text-sm text-ink-3 mb-12">Sist oppdatert {UPDATED}</p>

        <div className="space-y-6 text-[15px] leading-[1.65] text-ink-2">
          <div className="inline-flex items-center gap-2.5 rounded-pill bg-sage-tint px-4 py-2 text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden />
            <span className="font-medium">Fakturio er i drift</span>
          </div>

          <p>
            Vi har ikke en automatisk statusside med sanntidsovervåking ennå. Tjenesten er
            normalt tilgjengelig hele døgnet.
          </p>
          <p>
            Opplever du at noe ikke virker, gi oss beskjed på{" "}
            <a href={`mailto:${CONTACT}`} className="text-clay underline underline-offset-2">
              {CONTACT}
            </a>
            , så ser vi på det så raskt vi kan.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-ink/10 text-sm text-ink-3 flex gap-6">
          <Link href="/privacy" className="hover:text-ink transition-colors">Personvern</Link>
          <Link href="/terms" className="hover:text-ink transition-colors">Vilkår</Link>
        </div>
      </article>
    </div>
  );
}
