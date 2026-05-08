"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AIAssistCard({ onApply }: { onApply: (patch: unknown) => void }) {
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [trace, setTrace] = useState<string[]>([]);

  async function run() {
    setThinking(true);
    setTrace([]);
    try {
      const res = await fetch("/api/ai/draft-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      setTrace(json.trace ?? []);
      if (json.patch) onApply(json.patch);
    } catch {
      setTrace(["Kunne ikke nå AI-tjenesten. Prøv igjen senere."]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="bg-ink text-paper p-6">
      <div className="cap text-sun mb-3">AI-assistent</div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='"Lag faktura til Berge for designarbeid i mai, 12 timer."'
        className="w-full bg-transparent border-b border-paper/20 text-paper placeholder:text-ink-mute font-display italic text-[20px] leading-[1.2] resize-none outline-none focus:border-clay py-2"
        rows={3}
      />
      <p className="text-xs text-ink-mute mt-3 leading-[1.6]">
        Skriv det med ord — vi finner kunden, satser, og mva-prosent. Du redigerer, godkjenner, sender.
      </p>
      <Button
        variant="clay"
        size="sm"
        onClick={run}
        disabled={!prompt || thinking}
        className="mt-4 w-full"
      >
        {thinking ? "Tenker…" : "Foreslå"}
      </Button>
      {trace.length > 0 && (
        <div className="mt-4 p-3 bg-paper/5 font-mono text-[11px] text-paper-2/70 leading-[1.7]">
          {trace.map((line, i) => (
            <div key={i}>▸ {line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
