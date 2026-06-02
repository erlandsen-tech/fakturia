import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata = {
  title: "Personvernerklæring · Fakturio",
};

export const dynamic = "force-static";

// NOTE: This is a working draft following the Phase 2 outline. The final legal
// wording (kontaktopplysninger, overføring utenfor EØS, DPA-detaljer) must be
// reviewed and signed off by the controller before it is relied upon.
export default function PersonvernPage() {
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
        <h1 className="font-display text-3xl md:text-4xl mb-2">
          Personvernerklæring
        </h1>
        <p className="text-ink-3 text-sm mb-10">Sist oppdatert: 01.06.2026</p>

        <div className="space-y-8 text-ink-2 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              1. Behandlingsansvarlig
            </h2>
            <p>
              Fakturio (org.nr 925 100 200), Nesodden, er behandlingsansvarlig
              for personopplysninger som behandles om deg som bruker av
              tjenesten. Henvendelser om personvern kan rettes til{" "}
              <a className="underline" href="mailto:personvern@fakturio.no">
                personvern@fakturio.no
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              2. Hvilke personopplysninger vi behandler
            </h2>
            <p>Vi behandler følgende opplysninger:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                Kontoopplysninger: e-postadresse og passord (lagret som
                hash via Supabase Auth).
              </li>
              <li>
                Virksomhetsopplysninger du legger inn (firmanavn, org.nr,
                adresse, kontonummer m.m.).
              </li>
              <li>
                Kundedata du registrerer: dine kunders navn, e-post, adresse og
                org.nr.
              </li>
              <li>Fakturainnhold og fakturalinjer du oppretter.</li>
              <li>Betalingsdata i forbindelse med kjøp av fakturapakker.</li>
            </ul>
            <p className="mt-2">
              Kundedata behandles på vegne av deg. Du er behandlingsansvarlig
              for dine egne kunders personopplysninger, og Fakturio opptrer som
              databehandler for disse.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              3. Formål og rettslig grunnlag
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Levere og oppfylle avtalen om bruk av tjenesten (GDPR art.
                6(1)(b)).
              </li>
              <li>
                Oppfylle rettslige forpliktelser, herunder regnskapslagring
                etter bokføringsloven §13 med 5 års oppbevaring (art. 6(1)(c)).
              </li>
              <li>
                Berettiget interesse i drift, sikkerhet og feilretting (art.
                6(1)(f)).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              4. Lagringstid
            </h2>
            <p>
              Kontoopplysninger lagres så lenge du har en aktiv konto. Fakturaer
              og annen regnskapsdokumentasjon beholdes i minst 5 år som lovpålagt
              etter bokføringsloven §13 – også etter at kontoen er slettet.
              Sletting av en faktura skjer derfor som en «myk sletting»
              (markering), slik at utstedte dokumenter beholdes for
              oppbevaringsperioden.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              5. Underleverandører (databehandlere)
            </h2>
            <p>Vi benytter følgende databehandlere for å levere tjenesten:</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-ink/15">
                    <th className="py-2 pr-4">Leverandør</th>
                    <th className="py-2">Formål</th>
                  </tr>
                </thead>
                <tbody className="text-ink-2">
                  <tr className="border-b border-ink/10">
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2">
                      Database og autentisering (EU, Frankfurt)
                    </td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2">Betalingsbehandling</td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="py-2 pr-4">Resend</td>
                    <td className="py-2">Utsending av e-post</td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="py-2 pr-4">Sentry</td>
                    <td className="py-2">Feilovervåking</td>
                  </tr>
                  <tr className="border-b border-ink/10">
                    <td className="py-2 pr-4">Fly.io</td>
                    <td className="py-2">Drift og hosting</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">B2Brouter</td>
                    <td className="py-2">PEPPOL aksesspunkt for EHF</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Enkelte leverandører kan behandle data utenfor EU/EØS. Der dette
              skjer, er overføringen sikret gjennom databehandleravtaler og EUs
              standardkontrakter (SCC) der det er aktuelt.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              6. Dine rettigheter
            </h2>
            <p>
              Du har rett til innsyn, retting, sletting (med forbehold om
              lovpålagt regnskapslagring), begrensning og dataportabilitet. Du
              kan også klage til Datatilsynet dersom du mener behandlingen er i
              strid med personvernregelverket.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              7. Informasjonskapsler
            </h2>
            <p>
              Vi bruker nødvendige informasjonskapsler for innlogging og økt
              (Supabase-sesjon) samt valgt språk. Vi bruker ikke
              informasjonskapsler for markedsføring eller sporing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">8. Kontakt</h2>
            <p>
              Spørsmål om personvern kan rettes til{" "}
              <a className="underline" href="mailto:personvern@fakturio.no">
                personvern@fakturio.no
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">
              9. Endringer i erklæringen
            </h2>
            <p>
              Vi kan oppdatere denne erklæringen. Ved vesentlige endringer vil vi
              varsle gjennom tjenesten. Gjeldende versjon vises alltid på denne
              siden med oppdatert dato.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
