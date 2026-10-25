import { createClient } from "@/lib/supabase/server";
import type { Emprestimo } from "@/lib/types";

/** Empréstimos do usuário. Tolerante à tabela ainda não existir (antes da 0014). */
export async function loadEmprestimos(): Promise<Emprestimo[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("emprestimos").select("*").order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as Emprestimo[];
}
