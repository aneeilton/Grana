"use client";

/**
 * Controle segmentado (troca de visão dentro de uma mesma aba): trilho
 * neutro, segmento atual em superfície branca elevada. A cor da seção
 * aparece só no ponto do segmento ativo -- não em quatro botões cheios
 * competindo entre si.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; dot?: string }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-xl bg-ink-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 text-[13px] transition duration-200 ease-out-expo ${
              active ? "bg-white font-semibold text-ink-900 shadow-card" : "font-medium text-ink-500 hover:text-ink-800"
            }`}
          >
            {o.dot && active && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.dot}`} />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
