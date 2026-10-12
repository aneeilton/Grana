import type { LucideIcon } from "@/components/ui/icons";

// A cor fica só no ícone (com o papel fixo de cada família: verde =
// positivo, coral = dívida/saída, amarelo = atenção, roxo = cartões e
// investimentos, turquesa = informativo). O valor fica sempre em tinta
// neutra -- vários blocos pastel lado a lado viravam um arco-íris sem
// significado.
const TONES: Record<string, string> = {
  brand: "bg-brand-500",
  coral: "bg-coral-400",
  sun: "bg-sun-400",
  grape: "bg-grape-400",
  sky: "bg-sky-400",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "brand",
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof TONES;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-white p-3 shadow-card">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`app-icon h-7 w-7 rounded-[8px] ${TONES[tone]}`}>
          <Icon size={16} weight="fill" aria-hidden />
        </span>
        <span className="truncate text-[13px] font-medium text-ink-500">{label}</span>
      </div>
      <span
        className={`truncate font-bold leading-tight tracking-tight text-ink-900 ${compact ? "text-[15px]" : "text-[17px]"}`}
      >
        {value}
      </span>
    </div>
  );
}
