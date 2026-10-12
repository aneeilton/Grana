// Esqueleto exibido enquanto a tela busca os dados no Supabase: mantém a
// estrutura (título, card de resumo, lista) no lugar, em vez de uma tela
// em branco que depois "pula" quando o conteúdo chega.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Carregando…</span>
      <div className="px-5 pb-3 pt-7">
        <div className="h-8 w-40 rounded-lg bg-ink-200/70" />
        <div className="mt-2 h-4 w-56 rounded-md bg-ink-200/50" />
      </div>
      <div className="space-y-6 px-4 pt-1">
        <div className="h-[52px] rounded-2xl bg-white shadow-card" />
        <div className="h-40 rounded-3xl bg-ink-200/70" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] rounded-2xl bg-white shadow-card" />
          ))}
        </div>
        <div className="space-y-px overflow-hidden rounded-3xl bg-white shadow-card">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-9 w-9 rounded-xl bg-ink-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/2 rounded bg-ink-100" />
                <div className="h-3 w-1/3 rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
