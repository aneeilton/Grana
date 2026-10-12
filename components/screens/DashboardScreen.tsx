"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  FileWarning,
  Gem,
  PartyPopper,
  PiggyBank,
  Receipt,
  Repeat,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState, SectionHeader } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatCard } from "@/components/ui/StatCard";
import { DespesaDiariaCard } from "@/components/screens/DespesaDiariaCard";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { buildMonthlyProjection, mesCritico, valoresEfetivosPorItem } from "@/lib/projection";
import { comprasPorCartao, rotuloParcela, totalComprasNoMes } from "@/lib/cartoes";
import { MES_INICIAL, currentCompetencia, formatMoney, monthLabel, monthYearLabel } from "@/lib/format";
import type { Conta, GastoDiario, Item, Lancamento } from "@/lib/types";

export function DashboardScreen({
  items,
  initialLancamentos,
  initialGastosDiarios,
  initialContas,
  contaPadraoId,
  totalAplicado,
  totalDividas,
  totalBens,
}: {
  items: Item[];
  initialLancamentos: Lancamento[];
  initialGastosDiarios: GastoDiario[];
  initialContas: Conta[];
  contaPadraoId: string | null;
  totalAplicado: number;
  totalDividas: number;
  totalBens: number;
}) {
  const supabase = createClient();
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [gastosDiarios, setGastosDiarios] = useState(initialGastosDiarios);
  const [lancamentos, setLancamentos] = useState(initialLancamentos);
  const [contas, setContas] = useState(initialContas);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});
  const [saudacao, setSaudacao] = useState("Olá");
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const hora = new Date().getHours();
    setSaudacao(hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite");
    try {
      setOculto(localStorage.getItem("grana:oculto") === "1");
    } catch {
      // localStorage indisponível (ex: modo privado) -- mantém visível
    }
  }, []);

  function alternarOculto() {
    setOculto((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("grana:oculto", next ? "1" : "0");
      } catch {
        // sem persistência, só não lembra na próxima visita
      }
      return next;
    });
  }

  function fmt(value: number) {
    return oculto ? "R$ ••••" : formatMoney(value);
  }

  const saldoContas = useMemo(
    () => contas.reduce((s, c) => s + Number(c.saldo_corrente), 0),
    [contas]
  );
  const saldoAtual = saldoContas + totalAplicado;
  const patrimonioLiquido = saldoAtual + totalBens - totalDividas;

  const series = useMemo(
    () =>
      buildMonthlyProjection({
        saldoBase: saldoAtual,
        items,
        lancamentos,
        gastosDiarios,
        monthsBefore: 12,
        monthsAfter: 24,
      }),
    [saldoAtual, items, lancamentos, gastosDiarios]
  );

  const mes = series.find((s) => s.competencia === competencia) ?? series[0];

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Valor "vigente" de cada item no mes selecionado: o lancamento real, ou
  // -- pra item fixo sem lancamento nesse mes -- o valor do ultimo mes
  // lancado, repetido pra frente (mesma logica usada na projecao e no
  // Fluxo, pra essa lista nao mostrar zerado um item fixo sem lancamento
  // proprio ainda neste mes).
  const efetivosDoMes = useMemo(
    () => valoresEfetivosPorItem(items, lancamentos, competencia),
    [items, lancamentos, competencia]
  );

  const receitasDoMes = useMemo(
    () =>
      items
        .filter((i) => i.tipo === "receita")
        .map((i) => {
          const efetivo = efetivosDoMes.get(i.id);
          return {
            id: i.id,
            nome: i.nome,
            valor: efetivo?.valor ?? 0,
            pago: efetivo?.pago ?? false,
            inferido: efetivo?.inferido ?? false,
          };
        })
        .filter((v) => v.valor > 0)
        .sort((a, b) => Number(a.pago) - Number(b.pago) || a.nome.localeCompare(b.nome)),
    [items, efetivosDoMes]
  );

  const compras = useMemo(() => comprasPorCartao(items), [items]);

  // Compras lançadas num cartão não aparecem soltas: o valor delas soma
  // na linha da fatura do cartão.
  const despesasDoMes = useMemo(
    () =>
      items
        .filter((i) => i.tipo === "despesa" && !i.cartao_id)
        .map((i) => {
          const efetivo = efetivosDoMes.get(i.id);
          const parcelas = i.cartao ? totalComprasNoMes(compras.get(i.id), efetivosDoMes) : 0;
          return {
            id: i.id,
            nome: i.nome,
            fixo: i.fixo,
            cartao: i.cartao,
            dia: i.dia_vencimento,
            valor: (efetivo?.valor ?? 0) + parcelas,
            parcelas,
            parcela: rotuloParcela(i, lancamentos, competencia),
            pago: efetivo?.pago ?? false,
            inferido: efetivo?.inferido ?? false,
          };
        })
        .filter((v) => v.valor > 0)
        .sort((a, b) => Number(a.pago) - Number(b.pago) || (a.dia ?? 99) - (b.dia ?? 99)),
    [items, efetivosDoMes, compras, lancamentos, competencia]
  );

  async function ajustarSaldoConta(delta: number): Promise<string | null> {
    if (delta === 0 || !contaPadraoId) return null;
    const conta = contas.find((c) => c.id === contaPadraoId);
    if (!conta) return "Conta padrão não encontrada";
    const novoSaldo = Number(conta.saldo_corrente) + delta;
    const { data, error } = await supabase
      .from("contas")
      .update({ saldo_corrente: novoSaldo })
      .eq("id", contaPadraoId)
      .select()
      .single();
    if (error || !data) {
      return error?.message ?? "Falha ao atualizar saldo da conta";
    }
    setContas((prev) => prev.map((c) => (c.id === contaPadraoId ? (data as Conta) : c)));
    return null;
  }

  async function togglePago(itemId: string) {
    setTogglingId(itemId);
    setToggleErrors((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    const existing = lancamentos.find((l) => l.item_id === itemId && l.competencia === competencia);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setTogglingId(null);
      setToggleErrors((prev) => ({ ...prev, [itemId]: "Sessão não encontrada" }));
      return;
    }

    const novoPago = !(existing?.pago ?? false);
    const valor = existing?.valor ?? efetivosDoMes.get(itemId)?.valor ?? 0;

    const { data, error } = await supabase
      .from("lancamentos")
      .upsert(
        {
          id: existing?.id,
          item_id: itemId,
          user_id: user.id,
          competencia,
          valor,
          pago: novoPago,
        },
        { onConflict: "item_id,competencia" }
      )
      .select()
      .single();

    if (error || !data) {
      setTogglingId(null);
      setToggleErrors((prev) => ({ ...prev, [itemId]: error?.message ?? "Falha ao salvar" }));
      return;
    }
    const salvos: Lancamento[] = [data as Lancamento];

    // Fatura de cartão: as compras/parcelas do mês acompanham o pago da
    // fatura, e o valor delas também sai (ou volta) da conta padrão.
    let valorTotal = valor;
    if (itemsById.get(itemId)?.cartao) {
      const doMes = (compras.get(itemId) ?? [])
        .map((c) => lancamentos.find((l) => l.item_id === c.id && l.competencia === competencia))
        .filter((l): l is Lancamento => l !== undefined && l.pago !== novoPago);
      if (doMes.length) {
        const { data: atualizadas, error: comprasError } = await supabase
          .from("lancamentos")
          .update({ pago: novoPago })
          .in(
            "id",
            doMes.map((l) => l.id)
          )
          .select();
        if (comprasError || !atualizadas) {
          setToggleErrors((prev) => ({
            ...prev,
            [itemId]: `Fatura salva, mas as parcelas não: ${comprasError?.message ?? "falha ao salvar"}`,
          }));
        } else {
          salvos.push(...(atualizadas as Lancamento[]));
          valorTotal += doMes.reduce((s, l) => s + Number(l.valor), 0);
        }
      }
    }

    setTogglingId(null);
    setLancamentos((prev) => {
      const porId = new Map(salvos.map((l) => [l.id, l]));
      const atualizados = prev.map((l) => porId.get(l.id) ?? l);
      const novos = salvos.filter((s) => !prev.some((l) => l.id === s.id));
      return [...atualizados, ...novos];
    });

    const tipo = itemsById.get(itemId)?.tipo;
    if (tipo && valorTotal > 0) {
      const sinal = tipo === "receita" ? 1 : -1;
      const saldoError = await ajustarSaldoConta(novoPago ? sinal * valorTotal : -sinal * valorTotal);
      if (saldoError) {
        setToggleErrors((prev) => ({
          ...prev,
          [itemId]: `Lançamento salvo, mas saldo não foi ajustado: ${saldoError}`,
        }));
      }
    }
  }

  const saldoMes = mes.receitaTotal - mes.despesaTotal;

  const ultimoDiaMes = useMemo(() => {
    const [ano, numMes] = competencia.split("-").map(Number);
    return new Date(ano, numMes, 0).getDate();
  }, [competencia]);

  const proximoSemestre = useMemo(() => {
    const idxAtual = series.findIndex((s) => s.isCurrent);
    return idxAtual >= 0 ? series.slice(idxAtual, idxAtual + 6) : series.slice(0, 6);
  }, [series]);

  const resumoSemestre = useMemo(() => {
    const fixas = proximoSemestre.reduce((s, m) => s + m.despesaFixa, 0);
    const pontuais = proximoSemestre.reduce((s, m) => s + m.despesaPontual, 0);
    const receitas = proximoSemestre.reduce((s, m) => s + m.receitaTotal, 0);
    const comprometimento = receitas > 0 ? ((fixas + pontuais) / receitas) * 100 : 0;
    return { fixas, pontuais, receitas, comprometimento };
  }, [proximoSemestre]);

  // Indicadores próprios, fora do genérico "despesa fixa", sobre a
  // receita prevista dos próximos 6 meses:
  // - peso dos cartões: faturas (gastos avulsos + compras/parcelas nelas)
  // - comprometido com parcelas: tudo que é parcelado (no cartão ou não)
  const pesoCartoesDividas = useMemo(() => {
    let cartoes = 0;
    let parcelas = 0;
    for (const m of proximoSemestre) {
      const efetivos = valoresEfetivosPorItem(items, lancamentos, m.competencia);
      for (const i of items) {
        if (i.tipo !== "despesa") continue;
        const valor = efetivos.get(i.id)?.valor ?? 0;
        if (i.cartao || i.cartao_id) cartoes += valor;
        if (i.parcelas_total) parcelas += valor;
      }
    }
    const receitas = resumoSemestre.receitas;
    const receitaMensal = proximoSemestre.length ? receitas / proximoSemestre.length : 0;
    return {
      cartoesPct: receitas > 0 ? (cartoes / receitas) * 100 : 0,
      cartoesMes: proximoSemestre.length ? cartoes / proximoSemestre.length : 0,
      parcelasPct: receitas > 0 ? (parcelas / receitas) * 100 : 0,
      parcelasMes: proximoSemestre.length ? parcelas / proximoSemestre.length : 0,
      // saldo devedor cadastrado em Dívidas, em meses de receita
      dividasEmMeses: receitaMensal > 0 ? totalDividas / receitaMensal : null,
    };
  }, [proximoSemestre, items, lancamentos, resumoSemestre.receitas, totalDividas]);

  function tomPctTexto(pct: number, atencao: number, critico: number) {
    return pct >= critico
      ? "text-coral-500"
      : pct >= atencao
        ? "text-sun-500"
        : "text-brand-700";
  }

  const comprometimentoTone =
    resumoSemestre.comprometimento >= 80
      ? { bg: "bg-coral-100", text: "text-coral-500" }
      : resumoSemestre.comprometimento >= 50
        ? { bg: "bg-sun-100", text: "text-sun-500" }
        : { bg: "bg-brand-100", text: "text-brand-700" };

  // Reserva em meses de custo: quantos meses o dinheiro disponível hoje
  // (contas + investido) banca as despesas médias previstas pros próximos
  // 6 meses, se a renda parasse.
  const reserva = useMemo(() => {
    const custoMensal =
      proximoSemestre.length > 0
        ? proximoSemestre.reduce((s, m) => s + m.despesaTotal, 0) / proximoSemestre.length
        : 0;
    const meses = custoMensal > 0 ? Math.max(0, saldoAtual) / custoMensal : null;
    return { custoMensal, meses };
  }, [proximoSemestre, saldoAtual]);

  const reservaTone =
    reserva.meses === null || reserva.meses >= 6
      ? { bg: "bg-brand-100", text: "text-brand-700", label: "Confortável" }
      : reserva.meses >= 3
        ? { bg: "bg-sun-100", text: "text-sun-500", label: "Razoável" }
        : { bg: "bg-coral-100", text: "text-coral-500", label: "Baixa" };

  const critico = useMemo(() => mesCritico(proximoSemestre), [proximoSemestre]);
  const criticoTone =
    critico && critico.saldoFinal < 0
      ? { bg: "bg-coral-100", text: "text-coral-500" }
      : critico && critico.saldoFinal < reserva.custoMensal
        ? { bg: "bg-sun-100", text: "text-sun-500" }
        : { bg: "bg-white shadow-card", text: "text-ink-900" };

  // "Sobra hoje" e "saúde financeira" olham sempre para o mês real de hoje,
  // não para o mês selecionado no seletor (que pode ser passado/futuro).
  const mesAtual = useMemo(() => series.find((s) => s.isCurrent) ?? series[0], [series]);

  const diasRestantesNoMes = useMemo(() => {
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    return Math.max(1, ultimoDia - hoje.getDate() + 1);
  }, []);

  const sobraHoje = Math.max(0, mesAtual.saldoFinal) / diasRestantesNoMes;

  const saudeFinanceira = useMemo(() => {
    const scoreComprometimento = Math.max(0, Math.min(100, 100 - resumoSemestre.comprometimento));

    const taxaPoupanca =
      mesAtual.receitaTotal > 0
        ? ((mesAtual.receitaTotal - mesAtual.despesaTotal) / mesAtual.receitaTotal) * 100
        : 0;
    const scorePoupanca = Math.max(0, Math.min(100, 50 + taxaPoupanca * 2.5));

    const patrimonioBruto = saldoAtual + totalBens;
    const razaoDivida = patrimonioBruto > 0 ? totalDividas / patrimonioBruto : totalDividas > 0 ? 1 : 0;
    const scoreDivida = Math.max(0, Math.min(100, 100 - razaoDivida * 100));

    const componentes = [
      {
        label: "Comprometimento de renda",
        score: scoreComprometimento,
        dica: "Suas despesas programadas tomam boa parte da renda esperada — reveja despesas fixas.",
      },
      {
        label: "Poupança do mês",
        score: scorePoupanca,
        dica: "O mês está fechando no zero a zero ou no vermelho — tente sobrar algo até o fim do mês.",
      },
      {
        label: "Endividamento",
        score: scoreDivida,
        dica: "Suas dívidas pesam bastante frente ao que você tem — priorize quitá-las.",
      },
    ];
    const nota = Math.round(
      componentes.reduce((s, c) => s + c.score, 0) / componentes.length
    );
    const pior = componentes.reduce((a, b) => (b.score < a.score ? b : a));

    return { nota, componentes, pior };
  }, [resumoSemestre.comprometimento, mesAtual, saldoAtual, totalBens, totalDividas]);

  const notaTone =
    saudeFinanceira.nota >= 80
      ? { bg: "bg-brand-100", text: "text-brand-700", label: "Excelente" }
      : saudeFinanceira.nota >= 60
        ? { bg: "bg-sky-100", text: "text-sky-500", label: "Boa" }
        : saudeFinanceira.nota >= 40
          ? { bg: "bg-sun-100", text: "text-sun-500", label: "Atenção" }
          : { bg: "bg-coral-100", text: "text-coral-500", label: "Crítica" };

  // Projecao do mes: soma tambem as receitas pendentes (ex: salario que
  // ainda nao caiu), nao so as despesas -- senao parecia que o dinheiro
  // que ainda vai entrar nao contava pra "sobra" do mes.
  const livreAposFaturas = saldoAtual + mesAtual.receitaPendente - mesAtual.despesaPendente;

  const toneText = (t: { text: string }) => t.text;

  return (
    <div>
      <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-7">
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em] text-ink-900">{saudacao}</h1>
          <p className="mt-0.5 text-[15px] text-ink-500">Seu resumo de {monthLabel(competencia).toLowerCase()}</p>
        </div>
        <button
          onClick={alternarOculto}
          aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
          aria-pressed={oculto}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 shadow-card transition active:scale-95"
        >
          {oculto ? <EyeOff size={19} strokeWidth={2} aria-hidden /> : <Eye size={19} strokeWidth={2} aria-hidden />}
        </button>
      </header>

      <div className="space-y-6 px-4 pt-1">
        <MonthSelector competencia={competencia} onChange={setCompetencia} minCompetencia={MES_INICIAL} />

        <SummaryCard
          tone="brand"
          title="Saldo nas contas"
          value={fmt(saldoAtual)}
          subtitle={
            <span className="flex items-start gap-1.5">
              {livreAposFaturas >= 0 ? (
                <Wallet size={15} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
              ) : (
                <TriangleAlert size={15} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
              )}
              <span>
                {fmt(livreAposFaturas)} previstos até o fim do mês · {fmt(sobraHoje)} por dia
              </span>
            </span>
          }
        >
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">A pagar</dt>
              <dd className="truncate text-[15px] font-semibold">{fmt(mesAtual.despesaPendente)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">A receber</dt>
              <dd className="truncate text-[15px] font-semibold">{fmt(mesAtual.receitaPendente)}</dd>
            </div>
          </dl>
        </SummaryCard>

        <section>
          <SectionHeader
            title="Patrimônio"
            action={
              <Link href="/patrimonio" className="-my-2 -mr-2 inline-flex min-h-11 items-center rounded-xl px-2 text-[15px] font-normal text-accent transition hover:bg-accent-50">
                Abrir
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={TrendingUp} label="Líquido" value={fmt(patrimonioLiquido)} tone="brand" />
            <StatCard icon={PiggyBank} label="Investido" value={fmt(totalAplicado)} tone="grape" />
            <StatCard icon={FileWarning} label="Dívidas" value={fmt(totalDividas)} tone="coral" />
            <StatCard icon={Gem} label="Bens" value={fmt(totalBens)} tone="sun" />
          </div>
          <Card className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="app-icon bg-sky-400">
                <ShieldCheck size={18} weight="fill" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink-900">
                  Reserva <span className={`font-semibold ${toneText(reservaTone)}`}>· {reservaTone.label}</span>
                </p>
                <p className="caption">
                  {reserva.meses === null
                    ? "Sem despesas previstas para calcular"
                    : `Contas + investido cobrem ${fmt(reserva.custoMensal)}/mês de custo`}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right">
              <span className="text-[22px] font-bold tracking-tight text-ink-900">
                {reserva.meses === null
                  ? "—"
                  : oculto
                    ? "••"
                    : reserva.meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </span>
              <span className="block text-xs font-medium text-ink-500">meses</span>
            </p>
          </Card>
        </section>

        <section>
          <SectionHeader title="Saúde financeira" />
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="app-icon bg-coral-400">
                  <Activity size={18} weight="bold" aria-hidden />
                </span>
                <p className={`text-[17px] font-semibold ${notaTone.text}`}>{notaTone.label}</p>
              </div>
              <p className="text-[28px] font-bold leading-none tracking-tight text-ink-900">
                {saudeFinanceira.nota}
                <span className="text-[15px] font-medium text-ink-400">/100</span>
              </p>
            </div>
            <ul className="mt-4 space-y-3">
              {saudeFinanceira.componentes.map((c) => (
                <li key={c.label}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-700">{c.label}</span>
                    <span className="font-semibold text-ink-900">{Math.round(c.score)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ease-out-expo ${
                        c.score >= 60 ? "bg-brand-500" : c.score >= 40 ? "bg-sun-400" : "bg-coral-400"
                      }`}
                      style={{ width: `${Math.max(4, c.score)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {saudeFinanceira.pior.score < 60 && (
              <p className="mt-4 rounded-xl bg-ink-50 p-3 text-[13px] text-ink-700">{saudeFinanceira.pior.dica}</p>
            )}
          </Card>
        </section>

        <DespesaDiariaCard competencia={competencia} gastosDiarios={gastosDiarios} onChange={setGastosDiarios} />

        <section>
          <SectionHeader title={`Fluxo de ${monthLabel(competencia).toLowerCase()}`} />
          <Card className="p-0">
            <ul className="divide-y divide-ink-100">
              <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2.5 text-[15px] text-ink-800">
                  <ArrowDownRight size={18} strokeWidth={2.25} className="text-brand-600" aria-hidden />
                  Entradas
                </span>
                <span className="text-[15px] font-semibold text-brand-700">{fmt(mes.receitaTotal)}</span>
              </li>
              <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2.5 text-[15px] text-ink-800">
                  <ArrowUpRight size={18} strokeWidth={2.25} className="text-coral-500" aria-hidden />
                  Saídas
                </span>
                <span className="text-[15px] font-semibold text-coral-500">{fmt(mes.despesaTotal)}</span>
              </li>
              <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                <span className="text-[15px] font-semibold text-ink-900">Resultado do mês</span>
                <span className={`text-[15px] font-bold ${saldoMes >= 0 ? "text-ink-900" : "text-coral-500"}`}>
                  {saldoMes >= 0 ? "+" : ""}
                  {fmt(saldoMes)}
                </span>
              </li>
            </ul>
            <p className="caption border-t border-ink-100 px-4 py-3">
              Saldo projetado até {ultimoDiaMes}/{monthLabel(competencia).toLowerCase()}:{" "}
              <span className="font-semibold text-ink-900">{fmt(mes.saldoFinal)}</span>
            </p>
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Próximos 6 meses"
            action={
              <Link href="/semestre" className="-my-2 -mr-2 inline-flex min-h-11 items-center rounded-xl px-2 text-[15px] font-normal text-accent transition hover:bg-accent-50">
                Semestre
              </Link>
            }
          />
          {critico && (
            <div
              role={critico.saldoFinal < 0 ? "alert" : undefined}
              className={`mb-3 flex items-start gap-3 rounded-2xl p-4 ${criticoTone.bg}`}
            >
              <TriangleAlert size={20} strokeWidth={2.25} className={`mt-0.5 shrink-0 ${criticoTone.text}`} aria-hidden />
              <div className="min-w-0">
                <p className={`text-[15px] font-semibold ${criticoTone.text}`}>
                  Mês mais apertado: {monthYearLabel(critico.competencia)}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-700">
                  {critico.saldoFinal < 0
                    ? `O saldo previsto fica negativo no fim do mês (${fmt(critico.saldoFinal)}). Antecipe uma receita ou corte despesas antes disso.`
                    : critico.saldoFinal < reserva.custoMensal
                      ? `Sobram só ${fmt(critico.saldoFinal)} no fim do mês, menos que um mês do seu custo médio. Evite gastos novos até lá.`
                      : `É o menor saldo previsto do período (${fmt(critico.saldoFinal)} no fim do mês), mas ainda com folga.`}
                </p>
              </div>
            </div>
          )}
          <Card className="p-0">
            <ul className="divide-y divide-ink-100">
              {[
                { icon: TrendingUp, cor: "text-brand-600", label: "Receitas previstas", value: fmt(resumoSemestre.receitas) },
                { icon: Repeat, cor: "text-ink-500", label: "Despesas fixas", value: fmt(resumoSemestre.fixas) },
                { icon: Receipt, cor: "text-ink-500", label: "Pontuais e parceladas", value: fmt(resumoSemestre.pontuais) },
              ].map((r) => (
                <li key={r.label} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2.5 text-[15px] text-ink-800">
                    <r.icon size={18} strokeWidth={2} className={`shrink-0 ${r.cor}`} aria-hidden />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold text-ink-900">{r.value}</span>
                </li>
              ))}
              {[
                {
                  label: "Comprometimento de renda",
                  hint: "fixas + pontuais ÷ receitas",
                  pct: resumoSemestre.comprometimento,
                  tone: toneText(comprometimentoTone),
                },
                {
                  label: "Peso dos cartões",
                  hint: `${fmt(pesoCartoesDividas.cartoesMes)}/mês`,
                  pct: pesoCartoesDividas.cartoesPct,
                  tone: tomPctTexto(pesoCartoesDividas.cartoesPct, 30, 50),
                },
                {
                  label: "Em parcelas",
                  hint: `${fmt(pesoCartoesDividas.parcelasMes)}/mês`,
                  pct: pesoCartoesDividas.parcelasPct,
                  tone: tomPctTexto(pesoCartoesDividas.parcelasPct, 15, 30),
                },
              ].map((r) => (
                <li key={r.label} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-ink-800">{r.label}</p>
                    <p className="caption">{r.hint} · da receita</p>
                  </div>
                  <span className={`shrink-0 text-[17px] font-bold ${r.tone}`}>{r.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
            {totalDividas > 0 && pesoCartoesDividas.dividasEmMeses !== null && (
              <p className="caption border-t border-ink-100 px-4 py-3">
                Dívidas ({fmt(totalDividas)}) equivalem a{" "}
                <span className="font-semibold text-ink-900">
                  {oculto
                    ? "••"
                    : pesoCartoesDividas.dividasEmMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                  meses
                </span>{" "}
                da sua receita média.
              </p>
            )}
          </Card>
        </section>

        <section>
          <SectionHeader title="Lançamentos do mês" />
          {!contaPadraoId && (
            <p className="caption mb-2 px-1">
              Defina uma conta padrão em{" "}
              <Link href="/patrimonio" className="font-medium text-accent">
                Patrimônio
              </Link>{" "}
              para que marcar como pago/recebido atualize o saldo automaticamente.
            </p>
          )}
          {receitasDoMes.length === 0 && despesasDoMes.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Nada lançado neste mês"
              hint="Receitas e despesas cadastradas no Fluxo aparecem aqui para marcar como pagas."
            />
          ) : (
            <div className="space-y-4">
              {receitasDoMes.length > 0 && (
                <div>
                  <p className="group-label pb-1.5">A receber</p>
                  <Card className="p-0">
                    <ul className="divide-y divide-ink-100">
                      {receitasDoMes.map((r) => (
                        <li key={r.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="app-icon bg-brand-500">
                              <TrendingUp size={18} weight="bold" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`truncate text-[15px] font-medium ${
                                  r.pago ? "text-ink-400 line-through decoration-ink-200" : "text-ink-900"
                                }`}
                              >
                                {r.nome}
                              </p>
                              <p className="caption truncate">
                                {fmt(r.valor)}
                                {r.inferido && " · previsto, repete o último mês"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => togglePago(r.id)}
                            disabled={togglingId === r.id}
                            aria-pressed={r.pago}
                            aria-label={`${r.nome}: ${r.pago ? "recebido, toque para marcar como pendente" : "pendente, toque para marcar como recebido"}`}
                            className={`status-pill disabled:opacity-50 ${r.pago ? "bg-brand-600 text-white" : "bg-sun-100 text-sun-500"}`}
                          >
                            {r.pago && <Check size={14} strokeWidth={2.75} aria-hidden />}
                            {r.pago ? "Recebido" : "Pendente"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              {despesasDoMes.length > 0 && (
                <div>
                  <p className="group-label pb-1.5">A pagar</p>
                  <Card className="p-0">
                    <ul className="divide-y divide-ink-100">
                      {despesasDoMes.map((v) => {
                        const VencIcon = v.cartao ? CreditCard : v.fixo ? Repeat : Receipt;
                        const detalhes = [
                          fmt(v.valor),
                          v.dia ? `vence dia ${v.dia}` : null,
                          v.parcela ? `parcela ${v.parcela}` : null,
                          v.parcelas > 0 ? `inclui ${fmt(v.parcelas)} em parcelas` : null,
                          v.inferido ? "previsto" : null,
                        ].filter(Boolean);
                        return (
                          <li key={v.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`app-icon ${
                                  v.cartao ? "bg-grape-400" : v.fixo ? "bg-sun-400" : "bg-coral-400"
                                }`}
                              >
                                <VencIcon size={18} weight="fill" aria-hidden />
                              </span>
                              <div className="min-w-0">
                                <p
                                  className={`truncate text-[15px] font-medium ${
                                    v.pago ? "text-ink-400 line-through decoration-ink-200" : "text-ink-900"
                                  }`}
                                >
                                  {v.nome}
                                </p>
                                <p className="caption truncate">{detalhes.join(" · ")}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => togglePago(v.id)}
                              disabled={togglingId === v.id}
                              aria-pressed={v.pago}
                              aria-label={`${v.nome}: ${v.pago ? "pago, toque para marcar como pendente" : "pendente, toque para marcar como pago"}`}
                              className={`status-pill disabled:opacity-50 ${v.pago ? "bg-brand-600 text-white" : "bg-sun-100 text-sun-500"}`}
                            >
                              {v.pago && <Check size={14} strokeWidth={2.75} aria-hidden />}
                              {v.pago ? "Pago" : "Pendente"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </div>
              )}

              {Object.entries(toggleErrors).map(([id, msg]) => (
                <p key={id} role="alert" className="px-1 text-[13px] font-medium text-coral-500">
                  {itemsById.get(id)?.nome ?? "Item"}: {msg}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
