"use client";

import { useState } from "react";
import { CarFront, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { MonthlyItemsScreen } from "@/components/screens/MonthlyItemsScreen";
import { CartoesScreen } from "@/components/screens/CartoesScreen";
import { ConsorciosScreen } from "@/components/screens/ConsorciosScreen";
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

      <div className="flex gap-1.5 px-4 pb-2">
        <button
          onClick={() => setAba("receita")}
          className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition ${
            aba === "receita" ? "bg-brand-600 text-white shadow-card" : "bg-ink-100 text-ink-500"
          }`}
        >
          Receitas
        </button>
        <button
          onClick={() => setAba("despesa")}
          className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition ${
            aba === "despesa" ? "bg-coral-500 text-white shadow-card" : "bg-ink-100 text-ink-500"
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setAba("cartoes")}
          className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition ${
            aba === "cartoes" ? "bg-grape-600 text-white shadow-card" : "bg-ink-100 text-ink-500"
          }`}
        >
          Cartões
        </button>
        <button
          onClick={() => setAba("consorcio")}
          className={`flex-1 rounded-2xl py-2.5 text-xs font-bold transition ${
            aba === "consorcio" ? "bg-sky-500 text-white shadow-card" : "bg-ink-100 text-ink-500"
          }`}
        >
          Consórcio
        </button>
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
