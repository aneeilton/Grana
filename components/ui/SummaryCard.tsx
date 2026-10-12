import type { ReactNode } from "react";

/**
 * Card de resumo colorido do topo das telas (saldo, receitas, despesas,
 * cartões, consórcio, semestre). Uma única anatomia pra todos:
 *
 *   título (o que é) · valor (o número que importa) · linha de apoio
 *   · barra opcional · lista opcional por item + total
 *
 * A cor de cada um tem papel fixo: brand = saldo/receitas, coral =
 * despesas, grape = cartões/projeção, sky = consórcio.
 */
const TONES = {
  brand: "bg-brand-600",
  coral: "bg-coral-500",
  grape: "bg-grape-500",
  sky: "bg-sky-500",
} as const;

export type SummaryRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  /** já pago/recebido, zerado etc. -- aparece mais apagado */
  muted?: boolean;
  icon?: ReactNode;
};

export function SummaryCard({
  tone,
  title,
  value,
  valueSuffix,
  subtitle,
  progress,
  progressLabel,
  rowsTitle,
  rows,
  totalLabel,
  totalValue,
  children,
}: {
  tone: keyof typeof TONES;
  title: ReactNode;
  value: ReactNode;
  valueSuffix?: ReactNode;
  subtitle?: ReactNode;
  /** 0..1 */
  progress?: number;
  /** texto logo abaixo da barra (ex: "R$ 3.500 recebidos · 60%") */
  progressLabel?: ReactNode;
  rowsTitle?: ReactNode;
  rows?: SummaryRow[];
  totalLabel?: ReactNode;
  totalValue?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={`rounded-3xl ${TONES[tone]} p-5 text-white`}>
      <p className="text-[13px] font-medium text-white/75">{title}</p>
      <p className="mt-1.5 text-[34px] font-bold leading-none tracking-[-0.02em]">
        {value}
        {valueSuffix && <span className="ml-1 text-[17px] font-semibold text-white/70">{valueSuffix}</span>}
      </p>
      {subtitle && <div className="mt-2 text-[13px] font-medium text-white/85">{subtitle}</div>}

      {progress !== undefined && (
        <div className="mt-4">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.max(0, Math.min(1, progress)) * 100)}
          >
            <div
              className="h-full rounded-full bg-white/90 transition-[width] duration-500 ease-out-expo"
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>
          {progressLabel && <p className="mt-2 text-[13px] font-medium text-white/85">{progressLabel}</p>}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 border-t border-white/15 pt-3">
          {rowsTitle && <p className="pb-1 text-[13px] font-medium text-white/75">{rowsTitle}</p>}
          <ul className="divide-y divide-white/10">
            {rows.map((r) => (
              <li key={r.id} className="flex min-h-9 items-center justify-between gap-3 py-1.5 text-[15px]">
                <span className={`flex min-w-0 items-center gap-1.5 ${r.muted ? "text-white/55" : "text-white/90"}`}>
                  {r.icon}
                  <span className="truncate">{r.label}</span>
                </span>
                <span className={`shrink-0 font-semibold ${r.muted ? "text-white/55" : ""}`}>{r.value}</span>
              </li>
            ))}
          </ul>
          {totalLabel && (
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/20 pt-2.5 text-[15px]">
              <span className="font-medium text-white/80">{totalLabel}</span>
              <span className="shrink-0 font-bold">{totalValue}</span>
            </div>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
