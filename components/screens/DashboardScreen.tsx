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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DespesaDiariaCard } from "@/components/screens/DespesaDiariaCard";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { buildMonthlyProjection, mesCritico, valoresEfetivosPorItem } from "@/lib/projection";
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

  const despesasDoMes = useMemo(
    () =>
      items
        .filter((i) => i.tipo === "despesa")
        .map((i) => {
          const efetivo = efetivosDoMes.get(i.id);
          return {
            id: i.id,
            nome: i.nome,
            fixo: i.fixo,
            cartao: i.cartao,
            dia: i.dia_vencimento,
            valor: efetivo?.valor ?? 0,
            pago: efetivo?.pago ?? false,
            inferido: efetivo?.inferido ?? false,
          };
        })
        .filter((v) => v.valor > 0)
        .sort((a, b) => Number(a.pago) - Number(b.pago) || (a.dia ?? 99) - (b.dia ?? 99)),
    [items, efetivosDoMes]
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

    setTogglingId(null);
    if (error || !data) {
      setToggleErrors((prev) => ({ ...prev, [itemId]: error?.message ?? "Falha ao salvar" }));
      return;
    }
    setLancamentos((prev) => {
      const found = prev.some((l) => l.id === (data as Lancamento).id);
      return found
        ? prev.map((l) => (l.id === (data as Lancamento).id ? (data as Lancamento) : l))
        : [...prev, data as Lancamento];
    });

    const tipo = itemsById.get(itemId)?.tipo;
    if (tipo && valor > 0) {
      const sinal = tipo === "receita" ? 1 : -1;
      const saldoError = await ajustarSaldoConta(novoPago ? sinal * valor : -sinal * valor);
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

  const comprometimentoTone =
    resumoSemestre.comprometimento >= 80
      ? { bg: "bg-coral-500/10", text: "text-coral-500" }
      : resumoSemestre.comprometimento >= 50
        ? { bg: "bg-sun-500/10", text: "text-sun-500" }
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
        ? { bg: "bg-sun-500/10", text: "text-sun-500", label: "Razoável" }
        : { bg: "bg-coral-500/10", text: "text-coral-500", label: "Baixa" };

  const critico = useMemo(() => mesCritico(proximoSemestre), [proximoSemestre]);
  const criticoTone =
    critico && critico.saldoFinal < 0
      ? { bg: "bg-coral-500/10", text: "text-coral-500" }
      : critico && critico.saldoFinal < reserva.custoMensal
        ? { bg: "bg-sun-500/10", text: "text-sun-500" }
        : { bg: "bg-ink-50", text: "text-ink-700" };

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
        ? { bg: "bg-sky-500/10", text: "text-sky-500", label: "Boa" }
        : saudeFinanceira.nota >= 40
          ? { bg: "bg-sun-500/10", text: "text-sun-500", label: "Atenção" }
          : { bg: "bg-coral-500/10", text: "text-coral-500", label: "Crítica" };

  // Projecao do mes: soma tambem as receitas pendentes (ex: salario que
  // ainda nao caiu), nao so as despesas -- senao parecia que o dinheiro
  // que ainda vai entrar nao contava pra "sobra" do mes.
  const livreAposFaturas = saldoAtual + mesAtual.receitaPendente - mesAtual.despesaPendente;

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{saudacao}!</h1>
          <p className="mt-0.5 text-sm text-ink-500">Aqui está o resumo das suas finanças</p>
        </div>
        <button
          onClick={alternarOculto}
          aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-500"
        >
          {oculto ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>

      <div className="space-y-4 px-4 pt-1">
        <MonthSelector competencia={competencia} onChange={setCompetencia} minCompetencia={MES_INICIAL} />

        <Card className="bg-gradient-to-br from-brand-600 to-brand-900 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Saldo nas contas
          </p>
          <p className="mt-1 text-3xl font-extrabold [font-variant-numeric:tabular-nums]">
            {fmt(saldoAtual)}
          </p>
          <p
            className={`mt-2 text-sm font-semibold ${
              livreAposFaturas >= 0 ? "text-brand-200" : "text-coral-200"
            }`}
          >
            {livreAposFaturas >= 0 ? "💸 " : "⚠️ "}
            {fmt(livreAposFaturas)} previstos até o fim do mês
          </p>
        </Card>

        <Card className="bg-coral-500/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-coral-500/80">
            Faturas em aberto
          </p>
          <p className="mt-1 text-2xl font-extrabold text-coral-500 [font-variant-numeric:tabular-nums]">
            {fmt(mesAtual.despesaPendente)}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={PiggyBank} label="Investido" value={fmt(totalAplicado)} tone="grape" />
          <StatCard icon={FileWarning} label="Dívidas" value={fmt(totalDividas)} tone="coral" />
          <StatCard icon={Gem} label="Bens" value={fmt(totalBens)} tone="sun" />
          <StatCard icon={TrendingUp} label="Patrimônio líquido" value={fmt(patrimonioLiquido)} tone="sky" />
        </div>

        <Card className={`flex items-center justify-between gap-3 ${reservaTone.bg}`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70 ${reservaTone.text}`}>
              <ShieldCheck size={17} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${reservaTone.text}`}>Reserva · {reservaTone.label}</p>
              <p className="text-[11px] text-ink-500">
                {reserva.meses === null
                  ? "Sem despesas previstas para calcular"
                  : `Contas + investido cobrem o custo médio de ${fmt(reserva.custoMensal)}/mês`}
              </p>
            </div>
          </div>
          <p className={`shrink-0 text-right font-extrabold [font-variant-numeric:tabular-nums] ${reservaTone.text}`}>
            <span className="text-xl">
              {reserva.meses === null ? "—" : oculto ? "••" : reserva.meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </span>
            <span className="block text-[10px] font-semibold">meses</span>
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${notaTone.bg} ${notaTone.text}`}>
                <Activity size={17} strokeWidth={2.25} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-800">Saúde financeira</p>
                <p className={`text-xs font-bold ${notaTone.text}`}>{notaTone.label}</p>
              </div>
            </div>
            <p className={`text-2xl font-extrabold [font-variant-numeric:tabular-nums] ${notaTone.text}`}>
              {saudeFinanceira.nota}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {saudeFinanceira.componentes.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-[11px] text-ink-500">
                  <span>{c.label}</span>
                  <span className="font-bold text-ink-700">{Math.round(c.score)}</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full ${
                      c.score >= 60 ? "bg-brand-500" : c.score >= 40 ? "bg-sun-400" : "bg-coral-400"
                    }`}
                    style={{ width: `${Math.max(4, c.score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {saudeFinanceira.pior.score < 60 && (
            <p className="mt-3 text-[11px] text-ink-500">{saudeFinanceira.pior.dica}</p>
          )}
        </Card>

        <DespesaDiariaCard
          competencia={competencia}
          gastosDiarios={gastosDiarios}
          onChange={setGastosDiarios}
        />

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink-800">Fluxo de {monthLabel(competencia).toLowerCase()}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-extrabold [font-variant-numeric:tabular-nums] ${
                saldoMes >= 0 ? "bg-brand-100 text-brand-700" : "bg-coral-500/10 text-coral-500"
              }`}
            >
              {saldoMes >= 0 ? "+" : ""}
              {fmt(saldoMes)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-brand-50 p-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                <ArrowDownRight size={13} strokeWidth={2.5} />
                Entradas
              </div>
              <p className="mt-1 text-lg font-extrabold text-brand-700 [font-variant-numeric:tabular-nums]">
                {fmt(mes.receitaTotal)}
              </p>
            </div>
            <div className="rounded-2xl bg-coral-500/10 p-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-coral-500">
                <ArrowUpRight size={13} strokeWidth={2.5} />
                Saídas
              </div>
              <p className="mt-1 text-lg font-extrabold text-coral-500 [font-variant-numeric:tabular-nums]">
                {fmt(mes.despesaTotal)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Saldo projetado até {ultimoDiaMes}/{monthLabel(competencia).toLowerCase()}:{" "}
            <span className="font-bold text-ink-800">{fmt(mes.saldoFinal)}</span>
          </p>
        </Card>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-ink-800">Resumo dos próximos 6 meses</p>
            <Link href="/semestre" className="text-xs font-bold text-brand-600">
              Ver mais →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon={Repeat}
              label="Fixas"
              value={fmt(resumoSemestre.fixas)}
              tone="sun"
              compact
            />
            <StatCard
              icon={CreditCard}
              label="Pontuais"
              value={fmt(resumoSemestre.pontuais)}
              tone="coral"
              compact
            />
            <StatCard
              icon={TrendingUp}
              label="Receitas"
              value={fmt(resumoSemestre.receitas)}
              tone="brand"
              compact
            />
          </div>
          <Card className={`mt-2 flex items-center justify-between ${comprometimentoTone.bg}`}>
            <div>
              <p className={`text-xs font-bold ${comprometimentoTone.text}`}>Comprometimento de renda</p>
              <p className="text-[11px] text-ink-500">
                (despesas fixas + pontuais) ÷ receitas previstas nos próx. 6 meses
              </p>
            </div>
            <p className={`text-xl font-extrabold [font-variant-numeric:tabular-nums] ${comprometimentoTone.text}`}>
              {resumoSemestre.comprometimento.toFixed(0)}%
            </p>
          </Card>
          {critico && (
            <Card className={`mt-2 flex items-start gap-3 ${criticoTone.bg}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70 ${criticoTone.text}`}>
                <TriangleAlert size={17} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${criticoTone.text}`}>
                  Mês mais apertado: {monthYearLabel(critico.competencia)}
                </p>
                <p className="text-[11px] text-ink-500">
                  {critico.saldoFinal < 0
                    ? `O saldo previsto fica negativo no fim do mês (${fmt(critico.saldoFinal)}). Antecipe uma receita ou corte despesas antes disso.`
                    : critico.saldoFinal < reserva.custoMensal
                      ? `Sobram só ${fmt(critico.saldoFinal)} no fim do mês, menos que um mês do seu custo médio. Evite gastos novos até lá.`
                      : `É o menor saldo previsto do período (${fmt(critico.saldoFinal)} no fim do mês), mas ainda com folga.`}
                </p>
              </div>
            </Card>
          )}
        </div>

        <div>
          <p className="mb-1 px-1 text-sm font-bold text-ink-800">Lançamentos do mês</p>
          {!contaPadraoId && (
            <p className="mb-2 px-1 text-[11px] text-ink-400">
              Defina uma conta padrão em <Link href="/patrimonio" className="font-bold text-brand-600">Patrimônio</Link> para
              que marcar como pago/recebido atualize o saldo automaticamente.
            </p>
          )}
          {receitasDoMes.length === 0 && despesasDoMes.length === 0 ? (
            <EmptyState icon={PartyPopper} title="Nada lançado neste mês" />
          ) : (
            <div className="space-y-3">
              {receitasDoMes.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    A receber
                  </p>
                  {receitasDoMes.map((r) => (
                    <Card key={r.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                          <TrendingUp size={16} strokeWidth={2} />
                        </span>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${r.pago ? "text-ink-400" : "text-ink-800"}`}>
                            {r.nome}
                          </p>
                          {r.inferido && <p className="text-[10px] text-ink-400">Previsto (repete o último mês)</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="font-extrabold text-ink-800 [font-variant-numeric:tabular-nums]">
                          {fmt(r.valor)}
                        </p>
                        <button
                          onClick={() => togglePago(r.id)}
                          disabled={togglingId === r.id}
                          className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                            r.pago ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          {r.pago && <Check size={12} strokeWidth={2.5} />}
                          {r.pago ? "Recebido" : "Pendente"}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {despesasDoMes.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">A pagar</p>
                  {despesasDoMes.map((v) => {
                    const VencIcon = v.cartao ? CreditCard : v.fixo ? Repeat : Receipt;
                    return (
                      <Card key={v.id} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                              v.fixo ? "bg-sun-500/10 text-sun-500" : "bg-coral-500/10 text-coral-500"
                            }`}
                          >
                            <VencIcon size={16} strokeWidth={2} />
                          </span>
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-semibold ${v.pago ? "text-ink-400" : "text-ink-800"}`}>
                              {v.nome}
                            </p>
                            {v.dia && <p className="text-xs text-ink-400">Vence dia {v.dia}</p>}
                            {v.inferido && (
                              <p className="text-[10px] text-ink-400">Previsto (repete o último mês)</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <p className="font-extrabold text-ink-800 [font-variant-numeric:tabular-nums]">
                            {fmt(v.valor)}
                          </p>
                          <button
                            onClick={() => togglePago(v.id)}
                            disabled={togglingId === v.id}
                            className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                              v.pago ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
                            }`}
                          >
                            {v.pago && <Check size={12} strokeWidth={2.5} />}
                            {v.pago ? "Pago" : "Pendente"}
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {Object.entries(toggleErrors).map(([id, msg]) => (
                <p key={id} className="px-1 text-xs font-medium text-coral-500">
                  {itemsById.get(id)?.nome ?? "Item"}: {msg}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
