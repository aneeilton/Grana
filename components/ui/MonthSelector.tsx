import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentCompetencia, monthYearLabel, shiftCompetencia } from "@/lib/format";

export function MonthSelector({
  competencia,
  onChange,
  minCompetencia,
}: {
  competencia: string;
  onChange: (competencia: string) => void;
  minCompetencia?: string;
}) {
  const noPassado = !!minCompetencia && competencia <= minCompetencia;
  const hoje = currentCompetencia();
  const ehHoje = competencia === hoje;
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-1 shadow-card">
      <button
        onClick={() => onChange(shiftCompetencia(competencia, -1))}
        disabled={noPassado}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 active:scale-95 disabled:opacity-25"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
      </button>
      <div className="flex flex-col items-center leading-tight" aria-live="polite">
        <span className="text-[15px] font-semibold text-ink-900">{monthYearLabel(competencia)}</span>
        {ehHoje ? (
          <span className="text-[11px] font-medium text-brand-700">Mês atual</span>
        ) : (
          <button
            onClick={() => onChange(hoje)}
            className="text-[11px] font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Voltar para o mês atual
          </button>
        )}
      </div>
      <button
        onClick={() => onChange(shiftCompetencia(competencia, 1))}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 active:scale-95"
        aria-label="Próximo mês"
      >
        <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
