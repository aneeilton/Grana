"use client";

import { OctagonAlert } from "@/components/ui/icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50 p-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-500">
        <OctagonAlert size={22} strokeWidth={1.75} />
      </span>
      <p className="text-[17px] font-semibold text-ink-900">Algo deu errado ao carregar essa tela</p>
      <p className="max-w-xs break-words rounded-2xl bg-white p-3 text-xs text-ink-500 shadow-card">
        {error.message || "Erro sem mensagem (verifique os Runtime Logs na Vercel)."}
        {error.digest && (
          <>
            <br />
            <span className="text-ink-400">digest: {error.digest}</span>
          </>
        )}
      </p>
      <button
        onClick={reset}
        className="btn-primary px-5"
      >
        Tentar de novo
      </button>
    </div>
  );
}
