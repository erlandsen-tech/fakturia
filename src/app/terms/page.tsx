import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vilkår · Fakturio",
  description:
    "Vilkårene for bruk av Fakturio: betal per faktura, ingen binding, og du eier alltid dataene dine.",
};

const COMPANY = "AIAKAKI";
const ORG_NR = "937 074 212";
const CONTACT = "hei@fakturio.no";
const UPDATED = "29. mai 2026";

export default function TermsPage() {
  return (
    <div className="bg-paper-grain text-ink min-h-screen">
      <article className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <Link href="/" className="cap text-ink-mute hover:text-ink transition-colors">
          Fakturio
        </Link>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[1.05] tracking-[-0.02em] mt-6 mb-2">
          Vilkår
        </h1>
        <p className="text-sm text-ink-3 mb-12">Sist oppdatert {UPDATED}</p>

        <div className="space-y-10 text-[15px] leading-[1.65] text-ink-2">
          <p className="text-[17px] text-ink">
            Disse vilkårene gjelder bruken av Fakturio, levert av {COMPANY} (org.nr {ORG_NR}).
            Ved å opprette en konto godtar du vilkårene.
          </p>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Tjenesten</h2>
            <p>
              Fakturio lar deg opprette fakturaer, laste dem ned som PDF og som EHF 3.0 /
              PEPPOL BIS Billing 3.0-formatert XML, og sende dem på e-post til kundene dine.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Konto</h2>
            <p>
              Du må registrere en konto med en gyldig e-postadresse. Du er ansvarlig for å holde
              påloggingen din hemmelig og for all aktivitet på kontoen, inkludert bruk via
              API-nøkler du selv oppretter.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Pris og betaling</h2>
            <p>
              Fakturio betales per faktura, i pakker på 5, 10 eller 25 fakturaer. Ingen
              abonnement, ingen binding. Nye brukere får 3 fakturaer gratis ved registrering.
              Betaling håndteres av Stripe. Priser er oppgitt eksklusiv mva. Kjøpte
              fakturapakker utløper ikke.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Innholdet ditt</h2>
            <p>
              Du eier dataene og fakturaene du oppretter. Du gir oss kun den tilgangen som
              trengs for å levere tjenesten: lagre, vise, generere PDF og XML, og sende e-post
              når du ber om det. Du er ansvarlig for at innholdet i fakturaene dine er korrekt
              og lovlig.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">EHF og innsending</h2>
            <p>
              Fakturio genererer EHF- og PEPPOL-formatert XML etter spesifikasjonen. Vi sender
              den ikke automatisk over PEPPOL-nettverket: du laster den ned eller får den som
              vedlegg, og er selv ansvarlig for å kontrollere og sende den videre. Vi garanterer
              ikke at enhver mottaker eller ethvert system aksepterer filen.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Akseptabel bruk</h2>
            <p>
              Du skal ikke bruke Fakturio til ulovlig fakturering, svindel, eller på måter som
              overbelaster tjenesten eller forsøker å omgå sikkerheten. Vi kan stenge kontoer
              som misbruker tjenesten.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Tjenesten leveres som den er</h2>
            <p>
              Vi jobber for at Fakturio skal være tilgjengelig og virke som forventet, men
              tjenesten leveres uten garantier. Vi garanterer ikke uavbrutt drift eller at
              e-post alltid kommer frem, siden levering avhenger av mottakerens e-postserver.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Ansvarsbegrensning</h2>
            <p>
              {COMPANY} er ikke ansvarlig for indirekte tap, tapt fortjeneste eller følgeskader
              som følge av bruk av tjenesten. Samlet ansvar er begrenset til det du har betalt
              for tjenesten de siste tolv månedene.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Oppsigelse</h2>
            <p>
              Du kan slutte å bruke tjenesten når som helst. Vi kan avslutte eller endre
              tjenesten med rimelig varsel.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Lovvalg</h2>
            <p>Norsk rett gjelder. Eventuelle tvister løses ved norske domstoler.</p>
          </section>

          <section>
            <h2 className="font-display text-[24px] text-ink mb-3">Kontakt</h2>
            <p>
              <a href={`mailto:${CONTACT}`} className="text-clay underline underline-offset-2">
                {CONTACT}
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-ink/10 text-sm text-ink-3 flex gap-6">
          <Link href="/privacy" className="hover:text-ink transition-colors">Personvern</Link>
          <Link href="/status" className="hover:text-ink transition-colors">Status</Link>
        </div>
      </article>
    </div>
  );
}
