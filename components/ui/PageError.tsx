import { OctagonAlert } from "@/components/ui/icons";

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (error && typeof error === "object") {
    const withMessage = error as { message?: unknown; code?: unknown; details?: unknown };
    if (typeof withMessage.message === "string") {
      const extras = [withMessage.code, withMessage.details].filter(
        (v): v is string => typeof v === "string" && v.length > 0
      );
      return extras.length ? `${withMessage.message} (${extras.join(" — ")})` : withMessage.message;
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function PageError({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50 p-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-500">
        <OctagonAlert size={22} strokeWidth={1.75} />
      </span>
      <p className="text-[17px] font-semibold text-ink-900">Erro ao carregar essa tela</p>
      <pre className="max-w-sm overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-3 text-left text-xs text-coral-500 shadow-card">
        {describeError(error)}
      </pre>
    </div>
  );
}
