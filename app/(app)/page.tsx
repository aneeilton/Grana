import { loadFinanceSnapshot } from "@/lib/dashboardData";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { PageError } from "@/components/ui/PageError";

export default async function DashboardPage() {
  const result = await loadFinanceSnapshot();
  if (!result.ok) return <PageError error={result.error} />;
  const { data } = result;

  return (
    <DashboardScreen
      items={data.items}
      initialLancamentos={data.lancamentos}
      initialGastosDiarios={data.gastosDiarios}
      initialContas={data.contas}
      contaPadraoId={data.contaPadraoId}
      totalAplicado={data.totalAplicado}
      totalDividas={data.totalDividas}
      totalBens={data.totalBens}
      compromissos={data.compromissos}
    />
  );
}
