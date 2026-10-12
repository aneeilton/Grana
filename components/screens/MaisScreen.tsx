"use client";

import { useState } from "react";
import { Sparkles } from "@/components/ui/icons";
import { TopHeader } from "@/components/TopHeader";
import { Card } from "@/components/ui/Card";
import { AccountSyncCard } from "@/components/screens/AccountSyncCard";

export function MaisScreen({
  isAnonymous,
  email,
  userId,
}: {
  isAnonymous: boolean;
  email: string | null;
  userId: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copiarId() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex: http sem TLS) -- o texto já fica selecionável na tela
    }
  }

  return (
    <div>
      <TopHeader icon={Sparkles} title="Mais" subtitle="Conta e configurações" />

      <div className="space-y-4 px-4 pt-1">
        <AccountSyncCard isAnonymous={isAnonymous} email={email} />

        <Card>
          <p className="text-[13px] font-semibold text-ink-500">
            ID desta sessão
          </p>
          <p className="mt-1 break-all font-mono text-[13px] text-ink-800 selection:bg-accent-100">{userId ?? "—"}</p>
          <p className="caption mt-1">
            Compare com a coluna "user_id" no Supabase se os dados não estiverem aparecendo — se
            for diferente, os dados foram importados para outra conta.
          </p>
          {userId && (
            <button
              onClick={copiarId}
              className="btn-secondary mt-3 min-h-10 px-3 text-[13px]"
            >
              {copied ? "Copiado!" : "Copiar ID"}
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}
