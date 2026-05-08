'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, ArrowRight, Zap, Shield, Clock, Users, FileText, CreditCard, BarChart3, Globe, Lock } from 'lucide-react';

const benefits = [
  {
    icon: <Zap className="w-6 h-6 text-emerald-500" />,
    title: 'Faktura på sekunder',
    description: 'Opprett og send profesjonelle fakturaer på under ett minutt. Ingen komplisert programvare.',
  },
  {
    icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
    title: 'Betal per faktura',
    description: 'Kjøp en pakke når du trenger det. Ingen abonnement, ingen binding, ingen overraskelser.',
  },
  {
    icon: <Shield className="w-6 h-6 text-emerald-500" />,
    title: 'Bygget for norske bedrifter',
    description: 'Norsk MVA-håndtering, fakturanummer og betalingsfrist. EHF/Altinn er på roadmap.',
  },
  {
    icon: <FileText className="w-6 h-6 text-emerald-500" />,
    title: 'API for automatisering',
    description: 'Lag fakturaer programmatisk fra ditt eget system eller fra en AI-agent.',
  },
  {
    icon: <Clock className="w-6 h-6 text-emerald-500" />,
    title: 'PDF rett til kunden',
    description: 'Hver faktura sendes som PDF på e-post — ferdig formatert og klar til betaling.',
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-emerald-500" />,
    title: 'Oversikt over alt',
    description: 'Følg med på utestående, betalte og forfalte fakturaer i ett dashbord.',
  },
];

const steps = [
  {
    step: '1',
    title: 'Opprett konto',
    description: 'Registrer deg med e-post. Ingen kredittkort nødvendig.',
  },
  {
    step: '2',
    title: 'Legg til kunde',
    description: 'Legg til kunden en gang, bruk dem igjen og igjen.',
  },
  {
    step: '3',
    title: 'Send faktura',
    description: 'Velg kunde, legg til linjer, send. Klar på under et minutt.',
  },
];

const faqs = [
  {
    q: 'Trenger jeg et abonnement?',
    a: 'Nei. Vi selger ikke abonnementer. Du kjøper en pakke med fakturaer (5, 10 eller 25) og bruker dem når du vil. Pakkene utløper aldri.',
  },
  {
    q: 'Hvordan sender jeg faktura til det offentlige (EHF)?',
    a: 'EHF/Peppol-støtte er på roadmap. I dag sender vi faktura som PDF på e-post.',
  },
  {
    q: 'Kan jeg bruke API-et?',
    a: 'Ja. Du kan opprette API-nøkler under Innstillinger og sende fakturaer programmatisk. Hver faktura sendt via API trekker fra én faktura i pakken din.',
  },
  {
    q: 'Er dataene mine trygge?',
    a: 'All kommunikasjon er kryptert (HTTPS), passord lagres aldri i klartekst, og hver bruker ser kun sine egne data (Row-Level Security i databasen). Personvernerklæring og databehandleravtale kommer.',
  },
  {
    q: 'Kan jeg prøve gratis?',
    a: 'Ja! Du får 3 gratis fakturaer når du registrerer deg. Ingen betaling før du er klar.',
  },
];

const testimonials = [
  {
    quote: 'Jeg sendte min første faktura på 30 sekunder. Dette er akkurat så enkelt det skal være.',
    name: 'Maria K.',
    role: 'Frilanser, Oslo',
  },
  {
    quote: 'Sluttet å betale 299 kr i måneden for et program jeg brukte 4 ganger. Nå betaler jeg bare for det jeg faktisk bruker.',
    name: 'Thomas B.',
    role: 'Konsulent, Bergen',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Fakturio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Logg inn</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                Start gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-emerald-200 text-emerald-700 bg-emerald-50">
            🌱 Norsk, enkelt, rimelig
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Fakturering uten<br />
            <span className="text-emerald-500">hodebry</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Lag og send profesjonelle fakturaer på minutter. Betal per faktura — ingen abonnement, ingen binding, ingen overraskelser. Perfekt for norske småbedrifter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8 h-14">
                Start gratis — 3 fakturaer <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#priser">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                Se priser
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">Ingen kredittkort. Ingen binding.</p>
        </div>

        {/* Roadmap — integrasjoner som kommer */}
        <div className="max-w-4xl mx-auto mt-16">
          <p className="text-center text-xs uppercase tracking-wider text-slate-400 mb-4">
            På roadmap — kommer snart
          </p>
          <div className="flex flex-wrap justify-center gap-6 items-center opacity-60">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Shield className="w-4 h-4" /> Brønnøysundregistrene
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Globe className="w-4 h-4" /> EHF / Altinn
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Lock className="w-4 h-4" /> BankID-pålogging
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <CreditCard className="w-4 h-4" /> Vipps
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Alt du trenger — ingenting du ikke trenger
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Fakturio er bygget for norske enkeltpersonforetak og småbedrifter som vil ha fakturering til rett pris.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <Card key={i} className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                  <div className="mb-4">{b.icon}</div>
                  <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-slate-600 text-sm">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 text-center">
            Slik fungerer det
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Brukere som allerede har spart tid</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                  <p className="text-slate-300 italic mb-4">"{t.quote}"</p>
                  <p className="text-white font-semibold">{t.name}</p>
                  <p className="text-slate-500 text-sm">{t.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="priser" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Enkelt pris — ingen binding
            </h2>
            <p className="text-lg text-slate-600">
              Kjøp fakturaer når du trenger dem, eller abonner for ubegrenset.
            </p>
          </div>

          {/* Bundle packs */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-slate-700 mb-6 text-center">Faktura-pakker — betal per faktura</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: '5-pakke', price: '49', per: '9.80/faktura', highlight: false },
                { name: '10-pakke', price: '89', per: '8.90/faktura', highlight: false },
                { name: '25-pakke', price: '199', per: '7.96/faktura', highlight: true },
              ].map((pack, i) => (
                <Card key={i} className={`border-2 ${pack.highlight ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <CardContent className="pt-6 text-center">
                    {pack.highlight && <Badge className="mb-2 bg-emerald-500">Mest populær</Badge>}
                    <h4 className="font-semibold text-slate-900 mb-2">{pack.name}</h4>
                    <div className="text-4xl font-bold text-slate-900 mb-1">{pack.price} kr</div>
                    <p className="text-sm text-slate-500 mb-4">{pack.per}</p>
                    <Link href="/sign-up">
                      <Button variant={pack.highlight ? 'default' : 'outline'} className={`w-full ${pack.highlight ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                        Kjøp {pack.name.toLowerCase()}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Betal per faktura — ingen binding, ingen overraskelser.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Spørsmål og svar</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="border-slate-200">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">{faq.q}</span>
                  <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-slate-600">{faq.a}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4 bg-emerald-500 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Klar for din første faktura?
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            Start gratis i dag. 3 fakturaer på huset — ingen binding.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 text-lg px-10 h-14">
              Opprett konto gratis <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Fakturio</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900">Personvern</a>
            <a href="#" className="hover:text-slate-900">Vilkår</a>
            <a href="#" className="hover:text-slate-900">Kontakt</a>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <span>© {new Date().getFullYear()} Fakturio</span>
          </div>
        </div>
      </footer>
    </main>
  );
}