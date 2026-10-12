"use client";

import { useState } from "react";
import { Landmark, FileWarning, Gem } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { Card } from "@/components/ui/Card";
import { ContasScreen } from "@/components/screens/ContasScreen";
import { DividasScreen } from "@/components/screens/DividasScreen";
import { BensScreen } from "@/components/screens/BensScreen";
import { formatMoney } from "@/lib/format";
import type { Bem, Conta, Divida } from "@/lib/types";

type Aba = "contas" | "dividas" | "bens";

const ABAS: { id: Aba; label: string; icon: typeof Landmark }[] = [
  { id: "contas", label: "Contas", icon: Landmark },
  { id: "dividas", label: "Dívidas", icon: FileWarning },
  { id: "bens", label: "Bens", icon: Gem },
];

export function PatrimonioScreen({
  initialContas,
  initialContaPadraoId,
  initialDividas,
  initialBens,
  dividaConsorcio,
}: {
  initialContas: Conta[];
  initialContaPadraoId: string | null;
  initialDividas: Divida[];
  initialBens: Bem[];
  dividaConsorcio: number;
}) {
  const [aba, setAba] = useState<Aba>("contas");

  const [contasTotal, setContasTotal] = useState(() => ({
    corrente: initialContas.reduce((s, c) => s + Number(c.saldo_corrente), 0),
    aplicado: initialContas.reduce((s, c) => s + Number(c.saldo_aplicado), 0),
  }));
  const [dividasTotal, setDividasTotal] = useState(() =>
    initialDividas.reduce((s, d) => s + Number(d.valor), 0)
  );
  const [bensTotal, setBensTotal] = useState(() =>
    initialBens.reduce((s, b) => s + Number(b.valor), 0)
  );

  const patrimonioLiquido =
    contasTotal.corrente + contasTotal.aplicado + bensTotal - dividasTotal - dividaConsorcio;

  return (
    <div>
      <TopHeader icon={Landmark} title="Patrimônio" />

      <div className="space-y-4 px-4 pt-1">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-900 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Patrimônio líquido
          </p>
          <p className="mt-1 text-3xl font-extrabold [font-variant-numeric:tabular-nums]">
            {formatMoney(patrimonioLiquido)}
          </p>
          <p className="mt-1 text-xs text-white/70">Contas + aplicado + bens − dívidas</p>
        </Card>

        <div className="flex gap-1.5">
          {ABAS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition ${
                aba === item.id ? "bg-ink-800 text-white shadow-card" : "bg-ink-100 text-ink-500"
              }`}
            >
              <item.icon size={14} strokeWidth={2.25} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mantidas sempre montadas (so escondidas via CSS): desmontar a
          inativa fazia qualquer conta/divida/bem adicionado, ou a conta
          padrao trocada, sumir ao voltar pra essa aba -- a tela remontava
          do zero com os dados originais da carga da pagina. */}
      <div className={aba === "contas" ? "" : "hidden"}>
        <ContasScreen
          initialContas={initialContas}
          initialContaPadraoId={initialContaPadraoId}
          hideHeader
          onTotaisChange={(corrente, aplicado) => setContasTotal({ corrente, aplicado })}
        />
      </div>
      <div className={aba === "dividas" ? "" : "hidden"}>
        <DividasScreen
          initialDividas={initialDividas}
          dividaConsorcio={dividaConsorcio}
          hideHeader
          onTotalChange={setDividasTotal}
        />
      </div>
      <div className={aba === "bens" ? "" : "hidden"}>
        <BensScreen initialBens={initialBens} hideHeader onTotalChange={setBensTotal} />
      </div>
    </div>
  );
}
