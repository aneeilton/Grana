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
    <div role="tablist" aria-label={label} className="flex rounded-[10px] bg-track p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-1 text-[13px] transition duration-200 ease-out-expo ${
              active ? "bg-segment font-semibold text-ink-900 shadow-segment" : "font-medium text-ink-900 hover:bg-surface/50"
            }`}
          >
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
