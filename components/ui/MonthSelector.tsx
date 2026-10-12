import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
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
    <div className="flex items-center justify-between rounded-2xl bg-surface p-1 shadow-card">
      <button
        onClick={() => onChange(shiftCompetencia(competencia, -1))}
        disabled={noPassado}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-accent transition hover:bg-accent-50 active:opacity-60 disabled:opacity-25"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
      </button>
      <div className="flex flex-col items-center leading-tight" aria-live="polite">
        <span className="text-[15px] font-semibold text-ink-900">{monthYearLabel(competencia)}</span>
        {ehHoje ? (
          <span className="text-xs text-ink-400">Mês atual</span>
        ) : (
          <button
            onClick={() => onChange(hoje)}
            className="text-xs font-medium text-accent"
          >
            Voltar para o mês atual
          </button>
        )}
      </div>
      <button
        onClick={() => onChange(shiftCompetencia(competencia, 1))}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-accent transition hover:bg-accent-50 active:opacity-60"
        aria-label="Próximo mês"
      >
        <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
