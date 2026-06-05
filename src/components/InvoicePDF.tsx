import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Instrument Serif",
  src: "https://fonts.gstatic.com/s/instrumentserif/v17/jizDREVItHgc8qDIbSTKq4XIRPesnu5Q5g.ttf",
  fontStyle: "normal",
});
Font.register({
  family: "Instrument Serif",
  src: "https://fonts.gstatic.com/s/instrumentserif/v17/jizGREVItHgc8qDIbSTKq4XIRPesnu5Q3oH8sw.ttf",
  fontStyle: "italic",
});
Font.register({
  family: "Inter Tight",
  fonts: [
    { src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2JCaQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2JCaQ.ttf", fontWeight: 500 },
  ],
});
Font.register({
  family: "JetBrains Mono",
  src: "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVS-pNyldA.ttf",
});

const C = {
  paper:    "#FAF6ED",
  paper2:   "#EADFC9",
  paperBg:  "#D6CDB7",
  ink:      "#1A1815",
  ink2:     "#3B362E",
  ink3:     "#6B645A",
  inkMute:  "#9A9286",
  clay:     "#DC4F2C",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.paperBg,
    padding: 40,
    fontFamily: "Inter Tight",
    color: C.ink,
    fontSize: 11,
  },
  paper: {
    backgroundColor: C.paper,
    padding: 50,
    minHeight: "100%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 40 },
  wordmark: { fontFamily: "Instrument Serif", fontSize: 32, color: C.ink },
  wordmarkF: { fontFamily: "Instrument Serif", fontSize: 32, fontStyle: "italic" },
  wordmarkDot: { color: C.clay },
  senderMeta: { color: C.ink3, fontSize: 9, lineHeight: 1.6, marginTop: 10 },
  invoiceTitle: { fontFamily: "Instrument Serif", fontSize: 36, color: C.ink, textAlign: "right" },
  invoiceNo: { fontFamily: "JetBrains Mono", fontSize: 11, color: C.ink2, textAlign: "right", marginTop: 4 },

  addressRow: { flexDirection: "row", marginBottom: 30 },
  addressCol: { flex: 1 },
  cap: { fontSize: 8, letterSpacing: 1.4, color: C.inkMute, textTransform: "uppercase", marginBottom: 5 },
  serif: { fontFamily: "Instrument Serif", fontSize: 16, color: C.ink },
  small: { fontSize: 10, color: C.ink2, lineHeight: 1.6, marginTop: 4 },

  tableHead: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: C.ink,
    borderBottomWidth: 1, borderBottomColor: "rgba(26,24,21,0.12)", paddingVertical: 6,
  },
  th: { fontSize: 8, color: C.inkMute, textTransform: "uppercase", letterSpacing: 1.2 },
  row: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(26,24,21,0.06)",
    paddingVertical: 8, alignItems: "center",
  },
  cellNum:  { width: 30, fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 9 },
  cellDesc: { flex: 1, fontSize: 11 },
  cellQty:  { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 10 },
  cellUnit: { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 10 },
  cellPrice:{ width: 80, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 10 },
  cellVat:  { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 10 },
  cellSum:  { width: 90, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 11 },

  totalsBox: { marginTop: 20, alignSelf: "flex-end", minWidth: 280 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 11 },
  totalsLabel: { color: C.ink3 },
  totalsFinal: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 12, marginTop: 6, borderTopWidth: 2, borderTopColor: C.ink,
  },
  totalsFinalLabel: { fontFamily: "Instrument Serif", fontSize: 18 },
  totalsFinalValue: { fontFamily: "JetBrains Mono", fontSize: 18 },

  paymentBox: { marginTop: 30, padding: 20, backgroundColor: C.paper2, flexDirection: "row" },
  paymentCol: { flex: 1 },
  paymentValue: { fontFamily: "JetBrains Mono", fontSize: 13, marginTop: 4 },

  noteBlock: {
    marginTop: 24, fontFamily: "Instrument Serif", fontStyle: "italic",
    fontSize: 12, color: C.ink2, lineHeight: 1.5,
  },

  footer: {
    position: "absolute", bottom: 30, left: 50, right: 50,
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(26,24,21,0.1)",
    fontSize: 8, color: C.inkMute,
  },
});

export interface InvoicePDFProps {
  invoice: {
    number: string;
    issue_date: string;
    due_date: string;
    sender: {
      name: string; address: string; org_no: string; email: string; phone?: string;
      // VAT status drives the MVA suffix and the totals label. A seller who is
      // not registered in the Merverdiavgiftsregisteret must NOT print "MVA".
      vat_registered: boolean; vat_number?: string;
    };
    recipient: { name: string; company?: string; address: string; org_no?: string };
    references?: { ours?: string; theirs?: string };
    // amount = precomputed line net (NOK), already rounded in øre upstream.
    items: Array<{ description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; amount: number }>;
    // Precomputed totals (NOK) from the stored, authoritative øre values.
    totals: { subtotal: number; vat: number; total: number };
    payment: { account: string; kid?: string; iban?: string };
    note?: string;
  };
}

const fmt = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Trim trailing ",00"/zeros from a rate so "25.00" renders as "25".
const fmtRate = (r: number) => String(Number(r));

export function InvoicePDF({ invoice: i }: InvoicePDFProps) {
  const { subtotal, vat, total } = i.totals;
  const vatRegistered = i.sender.vat_registered;

  // Derive the MVA totals label from the actual line rates rather than a
  // hardcoded 25%. Non-registered sellers (or a 0 VAT total) show "ikke beregnet".
  const positiveRates = Array.from(new Set(i.items.map((it) => it.vat_rate).filter((r) => r > 0)));
  const vatLabel = !vatRegistered || vat === 0
    ? "MVA (ikke beregnet)"
    : positiveRates.length === 1
      ? `MVA ${fmtRate(positiveRates[0])}%`
      : "MVA";

  return (
    <Document title={`Faktura ${i.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.paper}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <View style={{ flexDirection: "row" }}>
                <Text style={styles.wordmarkF}>F</Text>
                <Text style={styles.wordmark}>akturio</Text>
                <Text style={[styles.wordmark, styles.wordmarkDot]}>.</Text>
              </View>
              <Text style={styles.senderMeta}>
                {i.sender.name}{"\n"}{i.sender.address}{"\n"}
                Org.nr {i.sender.org_no}{vatRegistered ? (i.sender.vat_number ? ` · ${i.sender.vat_number}` : " MVA") : ""}{"\n"}
                {i.sender.email}{i.sender.phone ? ` · ${i.sender.phone}` : ""}
                {!vatRegistered ? "\nIkke MVA-registrert. Merverdiavgift er ikke beregnet." : ""}
              </Text>
            </View>
            <View style={{ marginTop: 30 }}>
              <Text style={styles.invoiceTitle}>Faktura</Text>
              <Text style={styles.invoiceNo}>No. {i.number}</Text>
            </View>
          </View>

          {/* ADDRESS ROW */}
          <View style={styles.addressRow}>
            <View style={styles.addressCol}>
              <Text style={styles.cap}>Faktureres til</Text>
              <Text style={styles.serif}>{i.recipient.company ?? i.recipient.name}</Text>
              <Text style={styles.small}>
                {i.recipient.company ? `v/ ${i.recipient.name}\n` : ""}
                {i.recipient.address}
                {i.recipient.org_no ? `\nOrg.nr ${i.recipient.org_no}` : ""}
              </Text>
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.cap}>Detaljer</Text>
              <DetailRow label="Faktura-dato" value={i.issue_date} />
              <DetailRow label="Forfallsdato" value={i.due_date} />
              {i.references?.ours && <DetailRow label="Vår referanse" value={i.references.ours} />}
              {i.references?.theirs && <DetailRow label="Deres referanse" value={i.references.theirs} />}
            </View>
          </View>

          {/* ITEMS */}
          <View style={styles.tableHead}>
            <Text style={[styles.cellNum, styles.th]}>#</Text>
            <Text style={[styles.cellDesc, styles.th]}>Beskrivelse</Text>
            <Text style={[styles.cellQty, styles.th]}>Antall</Text>
            <Text style={[styles.cellUnit, styles.th]}>Enhet</Text>
            <Text style={[styles.cellPrice, styles.th]}>Á pris</Text>
            <Text style={[styles.cellVat, styles.th]}>Mva</Text>
            <Text style={[styles.cellSum, styles.th]}>Sum</Text>
          </View>
          {i.items.map((it, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.cellNum}>{String(idx + 1).padStart(2, "0")}</Text>
              <Text style={styles.cellDesc}>{it.description}</Text>
              <Text style={styles.cellQty}>{it.quantity}</Text>
              <Text style={styles.cellUnit}>{it.unit}</Text>
              <Text style={styles.cellPrice}>{fmt(it.unit_price)}</Text>
              <Text style={styles.cellVat}>{fmtRate(it.vat_rate)}%</Text>
              <Text style={styles.cellSum}>{fmt(it.amount)}</Text>
            </View>
          ))}

          {/* TOTALS */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sum eks. mva</Text>
              <Text style={{ fontFamily: "JetBrains Mono" }}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{vatLabel}</Text>
              <Text style={{ fontFamily: "JetBrains Mono" }}>{fmt(vat)}</Text>
            </View>
            <View style={styles.totalsFinal}>
              <Text style={styles.totalsFinalLabel}>Å betale NOK</Text>
              <Text style={styles.totalsFinalValue}>{fmt(total)}</Text>
            </View>
          </View>

          {/* PAYMENT */}
          <View style={styles.paymentBox}>
            <View style={styles.paymentCol}>
              <Text style={styles.cap}>Konto</Text>
              <Text style={styles.paymentValue}>{i.payment.account}</Text>
            </View>
            {i.payment.kid && (
              <View style={styles.paymentCol}>
                <Text style={styles.cap}>KID</Text>
                <Text style={styles.paymentValue}>{i.payment.kid}</Text>
              </View>
            )}
            {i.payment.iban && (
              <View style={styles.paymentCol}>
                <Text style={styles.cap}>IBAN</Text>
                <Text style={styles.paymentValue}>{i.payment.iban}</Text>
              </View>
            )}
          </View>

          {i.note && <Text style={styles.noteBlock}>&ldquo;{i.note}&rdquo;</Text>}

          <View style={styles.footer}>
            <Text>Side 1 av 1</Text>
            <Text>Sendt med Fakturio · fakturio.no</Text>
            <Text>Faktura no. {i.number}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ color: C.ink3, fontSize: 10 }}>{label}</Text>
      <Text style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>{value}</Text>
    </View>
  );
}
