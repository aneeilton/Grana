"use client";

import { useState } from "react";
import { Landmark, FileWarning, Gem } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Segmented } from "@/components/ui/Segmented";
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
        <SummaryCard
          tone="brand"
          title="Patrimônio líquido"
          value={formatMoney(patrimonioLiquido)}
          subtitle="Contas + aplicado + bens − dívidas"
        >
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">Contas e aplicado</dt>
              <dd className="truncate text-[15px] font-semibold">
                {formatMoney(contasTotal.corrente + contasTotal.aplicado)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">Dívidas</dt>
              <dd className="truncate text-[15px] font-semibold">{formatMoney(dividasTotal + dividaConsorcio)}</dd>
            </div>
          </dl>
        </SummaryCard>

        <Segmented
          label="Visão do patrimônio"
          value={aba}
          onChange={setAba}
          options={ABAS.map((a) => ({ value: a.id, label: a.label }))}
        />
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
