import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata = {
  title: "Vilkår for bruk · Fakturio",
};

export const dynamic = "force-static";

// NOTE: Working draft per the Phase 2 outline. Final wording (angrerett/refusjon,
// ansvarsbegrensning, verneting) must be reviewed and signed off before launch.
export default function VilkarPage() {
  return (
    <div className="bg-paper-grain text-ink min-h-screen">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto py-4 px-6 flex justify-between items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Wordmark size={0.7} />
          </Link>
          <Link href="/" className="text-sm text-ink-3 hover:text-ink">
            Tilbake til forsiden
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl md:text-4xl mb-2">Vilkår for bruk</h1>
        <p className="text-ink-3 text-sm mb-10">Sist oppdatert: 01.06.2026</p>

        <div className="space-y-8 text-ink-2 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              1. Innledning og aksept
            </h2>
            <p>
              Disse vilkårene gjelder for bruk av Fakturio. Ved å registrere deg
              og bruke tjenesten godtar du vilkårene. Godtar du ikke vilkårene,
              kan du ikke bruke tjenesten.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">2. Tjenesten</h2>
            <p>
              Fakturio er et faktureringsverktøy for norske
              enkeltpersonforetak. Tjenesten lar deg opprette fakturaer, generere
              PDF og eksportere EHF-fil (UBL/.xml) for fakturaen. EHF leveres som
              en nedlastbar fil; tjenesten utfører ikke selv levering over PEPPOL.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              3. Konto og ansvar
            </h2>
            <p>
              Du er ansvarlig for at fakturainnhold, MVA-behandling og egen
              regnskapsplikt er korrekt. Fakturio er et verktøy og er ikke
              regnskapsfører, revisor eller juridisk rådgiver. Du er ansvarlig
              for å holde innloggingsopplysningene dine sikre.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              4. Priser og betaling
            </h2>
            <p>
              Ved registrering får du 3 gratis fakturaer. Utover dette kjøper du
              fakturapakker som engangskjøp:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Pakke 5 – 49 NOK</li>
              <li>Pakke 10 – 89 NOK</li>
              <li>Pakke 25 – 199 NOK</li>
            </ul>
            <p className="mt-2">
              Priser er i norske kroner. Det finnes ingen løpende abonnement med
              automatisk fornyelse – du betaler kun for pakkene du velger å kjøpe.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              5. Angrerett og refusjon
            </h2>
            <p>
              Fakturapakker er en digital tjeneste som gjøres tilgjengelig
              umiddelbart etter kjøp. Forbrukte fakturakreditter refunderes ikke.
              Ta kontakt ved spørsmål om et kjøp.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              6. Dine data og regnskapsoppbevaring
            </h2>
            <p>
              Behandling av personopplysninger er beskrevet i{" "}
              <Link className="underline" href="/personvern">
                personvernerklæringen
              </Link>
              . Utstedte fakturaer beholdes i minst 5 år i henhold til
              bokføringsloven §13, også etter at kontoen er slettet.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              7. Ansvarsbegrensning og oppetid
            </h2>
            <p>
              Tjenesten leveres «som den er». Vi tilstreber høy oppetid, men kan
              ikke garantere uavbrutt tilgang. Vårt ansvar er begrenset så langt
              gjeldende rett tillater.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              8. Oppsigelse og sletting av konto
            </h2>
            <p>
              Du kan når som helst slutte å bruke tjenesten og be om å få kontoen
              slettet. Lovpålagt regnskapsdokumentasjon beholdes likevel i
              oppbevaringsperioden, jf. punkt 6.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              9. Lovvalg og verneting
            </h2>
            <p>
              Vilkårene reguleres av norsk rett. Tvister søkes løst i minnelighet,
              og ved rettslig prøving gjelder norske domstoler.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              10. Endringer i vilkårene
            </h2>
            <p>
              Vi kan endre vilkårene. Ved vesentlige endringer varsler vi gjennom
              tjenesten. Gjeldende versjon vises alltid på denne siden med
              oppdatert dato.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
