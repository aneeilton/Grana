import type { LucideIcon } from "lucide-react";

/**
 * Título grande no topo de cada aba (no estilo "large title"): o nome da
 * seção carrega a hierarquia sozinho, sem selo de ícone colorido -- o
 * ícone já está na barra de abas. `icon` continua aceito só por
 * compatibilidade de chamada.
 */
export function TopHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
}) {
  return (
    <header className="px-5 pb-3 pt-7">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-ink-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
