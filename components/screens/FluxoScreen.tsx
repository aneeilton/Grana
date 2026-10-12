"use client";

import { useState } from "react";
import { CarFront, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { MonthlyItemsScreen } from "@/components/screens/MonthlyItemsScreen";
import { CartoesScreen } from "@/components/screens/CartoesScreen";
import { ConsorciosScreen } from "@/components/screens/ConsorciosScreen";
import { Segmented } from "@/components/ui/Segmented";
import type { Consorcio, Conta, Item, Lancamento } from "@/lib/types";

type TipoDados = { items: Item[]; lancamentos: Lancamento[] };

export function FluxoScreen({
  receita,
  despesa,
  contas: initialContas,
  contaPadraoId,
  consorcios,
}: {
  receita: TipoDados;
  despesa: TipoDados;
  contas: Conta[];
  contaPadraoId: string | null;
  consorcios: Consorcio[];
}) {
  const [aba, setAba] = useState<"receita" | "despesa" | "cartoes" | "consorcio">("receita");
  // Levantado aqui (em vez de cada MonthlyItemsScreen ter sua propria copia)
  // porque as duas telas ajustam o saldo da MESMA conta padrao ao marcar
  // pago/recebido -- com copias independentes, alternar de aba fazia uma
  // sobrescrever o ajuste de saldo que a outra acabou de salvar.
  const [contas, setContas] = useState(initialContas);
  // Espelha items/lancamentos de despesa aqui so pra alimentar a aba
  // "Cartoes" (resumo agregado) sem duplicar toda a logica de edicao --
  // a fonte da verdade continua sendo o MonthlyItemsScreen de despesa.
  const [despesaItems, setDespesaItems] = useState(despesa.items);
  const [despesaLancamentos, setDespesaLancamentos] = useState(despesa.lancamentos);

  return (
    <div>
      <TopHeader
        icon={aba === "receita" ? TrendingUp : aba === "despesa" ? Wallet : aba === "cartoes" ? CreditCard : CarFront}
        title="Fluxo"
        subtitle={
          aba === "receita"
            ? "Suas fontes de renda"
            : aba === "despesa"
              ? "Suas contas e cartões"
              : aba === "cartoes"
                ? "Resumo dos seus cartões"
                : "Suas cotas e lances"
        }
      />

      <div className="px-4 pb-4">
        <Segmented
          label="Visão do fluxo"
          value={aba}
          onChange={setAba}
          options={[
            { value: "receita", label: "Receitas", dot: "bg-brand-500" },
            { value: "despesa", label: "Despesas", dot: "bg-coral-500" },
            { value: "cartoes", label: "Cartões", dot: "bg-grape-600" },
            { value: "consorcio", label: "Consórcio", dot: "bg-sky-500" },
          ]}
        />
      </div>

      {/* As duas telas ficam sempre montadas (so escondidas via CSS) em vez
          de desmontar a inativa: desmontar perdia edicoes em andamento
          (rascunho de valor, formulario de novo item aberto) sempre que o
          usuario so estava dando uma olhada na outra aba. */}
      <div className={aba === "receita" ? "" : "hidden"}>
        <MonthlyItemsScreen
          tipo="receita"
          title="Receitas"
          tone="brand"
          valueDoneLabel="Recebido"
          showDia={false}
          showExpectativa={true}
          initialItems={receita.items}
          initialLancamentos={receita.lancamentos}
          initialContas={contas}
          contaPadraoId={contaPadraoId}
          onContasChange={setContas}
          hideHeader
        />
      </div>
      <div className={aba === "despesa" ? "" : "hidden"}>
        <MonthlyItemsScreen
          tipo="despesa"
          title="Despesas"
          tone="coral"
          valueDoneLabel="Pago"
          showDia={true}
          showExpectativa={false}
          initialItems={despesa.items}
          initialLancamentos={despesa.lancamentos}
          initialContas={contas}
          contaPadraoId={contaPadraoId}
          onContasChange={setContas}
          onItemsChange={setDespesaItems}
          onLancamentosChange={setDespesaLancamentos}
          hideHeader
        />
      </div>
      <div className={aba === "cartoes" ? "" : "hidden"}>
        <CartoesScreen items={despesaItems} lancamentos={despesaLancamentos} />
      </div>
      <div className={aba === "consorcio" ? "" : "hidden"}>
        <ConsorciosScreen
          consorcios={consorcios}
          items={despesaItems}
          lancamentos={despesaLancamentos}
          saldoContas={contas.reduce((s, c) => s + Number(c.saldo_corrente) + Number(c.saldo_aplicado), 0)}
        />
      </div>
    </div>
  );
}
