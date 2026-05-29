import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personvern · Fakturio",
  description:
    "Hva Fakturio lagrer, hvorfor, og hva som er dine rettigheter. Ingen sporing, ingen annonsekapsler, vi selger aldri dataene dine.",
};

const COMPANY = "AIAKAKI";
const ORG_NR = "937 074 212";
const CONTACT = "hei@fakturio.no";
const UPDATED = "29. mai 2026";

export default function PrivacyPage() {
  return (
    <div className="bg-paper-grain text-ink min-h-screen">
      <article className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <Link href="/" className="cap text-ink-mute hover:text-ink transition-colors">
          Fakturio
        </Link>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[1.05] tracking-[-0.02em] mt-6 mb-2">
          Personvern
        </h1>
        <p className="text-sm text-ink-3 mb-12">Sist oppdatert {UPDATED}</p>

        <div className="space-y-10 text-[15px] leading-[1.65] text-ink-2">
          <p className="text-[17px] text-ink">
            Fakturio er laget for at fakturering skal være enkelt, ikke for å samle data
            om deg. Her er hva vi lagrer, hvorfor, og hva som er rettighetene dine.
          </p>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Behandlingsansvarlig</h2>
            <p>
              {COMPANY}, org.nr {ORG_NR}, Nesodden, Norge. Spørsmål om personvern?
              Kontakt oss på{" "}
              <a href={`mailto:${CONTACT}`} className="text-clay underline underline-offset-2">
                {CONTACT}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Hva vi lagrer</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Konto: e-postadressen din og et kryptert passord (håndtert av innloggingsleverandøren vår).</li>
              <li>Firmaopplysningene du legger inn: firmanavn, organisasjonsnummer, MVA-nummer, adresse og bankkonto.</li>
              <li>Kundene og fakturaene du oppretter, inkludert linjer og beløp.</li>
              <li>Kjøpshistorikk for fakturapakker. Selve kortbetalingen håndteres av Stripe, vi ser aldri kortnummeret ditt.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Hva vi ikke gjør</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Vi selger aldri dataene dine.</li>
              <li>Vi bruker dem ikke til reklame, profilering eller sporing.</li>
              <li>Vi har ingen analyse- eller annonsekapsler og ingen tredjeparts sporingsskript.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Informasjonskapsler</h2>
            <p>Vi bruker kun strengt nødvendige informasjonskapsler:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>En innloggingskapsel som holder deg pålogget.</li>
              <li>En kapsel som husker språkvalget ditt (norsk eller engelsk).</li>
            </ul>
            <p className="mt-3">
              Vi bruker ingen analyse-, annonse- eller sporingskapsler. Derfor har vi heller
              ingen cookie-banner, det finnes ingenting å samtykke til utover det som trengs
              for at tjenesten skal virke.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Underleverandører</h2>
            <p>For å levere tjenesten bruker vi noen få databehandlere, som kun behandler data på våre vegne:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><span className="text-ink">Supabase</span> for database, innlogging og lagring (EU-region).</li>
              <li><span className="text-ink">Stripe</span> for betaling av fakturapakker.</li>
              <li><span className="text-ink">Resend</span> for utsending av faktura-e-post.</li>
              <li><span className="text-ink">Sentry</span> for tekniske feilrapporter, så vi kan rette feil raskt.</li>
              <li><span className="text-ink">Fly.io</span> for drift av applikasjonen.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Lagring og sikkerhet</h2>
            <p>
              Data lagres i EU, og all trafikk er kryptert (HTTPS). Tilgang til dataene dine er
              begrenset til din egen konto gjennom rad-nivå sikkerhet i databasen.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Hvor lenge vi lagrer</h2>
            <p>
              Vi beholder dataene dine så lenge du har en konto. Be oss om å slette kontoen, så
              fjerner vi personopplysningene dine, med unntak av det vi eventuelt er lovpålagt å
              beholde (for eksempel bokføringsdata).
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Rettighetene dine</h2>
            <p>
              Etter personvernforordningen (GDPR) kan du be om innsyn, retting, sletting og
              utlevering av dataene dine. Kontakt oss på{" "}
              <a href={`mailto:${CONTACT}`} className="text-clay underline underline-offset-2">
                {CONTACT}
              </a>
              . Du kan også klage til{" "}
              <a
                href="https://www.datatilsynet.no"
                className="text-clay underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Datatilsynet
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Endringer</h2>
            <p>
              Vi oppdaterer denne siden ved behov. Ved vesentlige endringer gir vi deg beskjed.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-ink/10 text-sm text-ink-3 flex gap-6">
          <Link href="/terms" className="hover:text-ink transition-colors">Vilkår</Link>
          <Link href="/status" className="hover:text-ink transition-colors">Status</Link>
        </div>
      </article>
    </div>
  );
}
