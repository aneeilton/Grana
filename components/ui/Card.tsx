import type { LucideIcon } from "@/components/ui/icons";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`rounded-3xl bg-surface p-4 shadow-card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface px-6 py-10 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-ink-800">{title}</p>
      {hint && <p className="max-w-[16rem] text-[13px] text-ink-500">{hint}</p>}
    </div>
  );
}

/** Título de seção com ação opcional à direita (ex: "Ver mais"). */
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex min-h-8 items-end justify-between gap-3 px-1">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  );
}
