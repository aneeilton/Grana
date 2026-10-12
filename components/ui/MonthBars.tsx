"use client";

import { useState } from "react";

export type MonthBar = {
  key: string;
  /** rótulo curto no eixo (ex: "Out") */
  label: string;
  /** rótulo longo no detalhe (ex: "Outubro de 2026") */
  longLabel: string;
  value: number;
  /** destaque de estado: atenção (laranja) ou crítico (vermelho) */
  status?: "warn" | "danger";
};

const FILL = {
  normal: "fill-grape-400",
  warn: "fill-sun-400",
  danger: "fill-coral-400",
} as const;

/**
 * Barras por mês, desenhadas em SVG com as cores do tema (acompanham o
 * modo escuro). Base no zero: valores negativos descem abaixo da linha.
 * Toque numa barra para ver o valor.
 */
export function MonthBars({
  data,
  format,
  valueLabel,
  ariaLabel,
}: {
  data: MonthBar[];
  format: (v: number) => string;
  /** o que o valor é, no detalhe (ex: "Saldo no fim do mês") */
  valueLabel: string;
  ariaLabel: string;
}) {
  // sem toque, o detalhe mostra o pior mês em destaque (ou o último)
  const destaque =
    data.filter((d) => d.status).reduce<MonthBar | undefined>((a, b) => (!a || b.value < a.value ? b : a), undefined) ??
    data[data.length - 1];
  const [selKey, setSelKey] = useState<string | null>(null);
  const sel = data.find((d) => d.key === selKey) ?? destaque;

  const W = 320;
  const H = 128;
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const zeroY = (max / span) * H;
  const slot = W / Math.max(1, data.length);
  const barW = Math.min(30, slot * 0.56);

  return (
    <div>
      <svg
        viewBox={`0 -4 ${W} ${H + 26}`}
        className="h-auto w-full touch-manipulation"
        role="img"
        aria-label={ariaLabel}
      >
        {data.map((d, i) => {
          const h = Math.max(2, (Math.abs(d.value) / span) * H);
          const y = d.value >= 0 ? zeroY - h : zeroY;
          const x = i * slot + (slot - barW) / 2;
          const ativo = d.key === sel?.key;
          return (
            <g
              key={d.key}
              onClick={() => setSelKey(d.key)}
              className="cursor-pointer"
              role="button"
              aria-label={`${d.longLabel}: ${format(d.value)}`}
            >
              {/* área de toque maior que a barra */}
              <rect x={i * slot} y={-4} width={slot} height={H + 26} className="fill-transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                className={`${FILL[d.status ?? "normal"]} transition-opacity duration-200 ${
                  ativo ? "opacity-100" : "opacity-55"
                }`}
              />
              <text
                x={i * slot + slot / 2}
                y={H + 18}
                textAnchor="middle"
                className={`text-[12px] ${ativo ? "fill-ink-900 font-semibold" : "fill-ink-400"}`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={zeroY} y2={zeroY} className="stroke-ink-200" strokeWidth={1} />
      </svg>
      {sel && (
        <p className="mt-1 flex items-baseline justify-between gap-3 border-t border-ink-100 pt-3" aria-live="polite">
          <span className="text-[13px] text-ink-500">
            {valueLabel} · {sel.longLabel}
          </span>
          <span className={`shrink-0 text-[17px] font-bold ${sel.value < 0 ? "text-coral-500" : "text-ink-900"}`}>
            {format(sel.value)}
          </span>
        </p>
      )}
    </div>
  );
}
