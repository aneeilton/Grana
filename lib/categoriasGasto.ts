import {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Gamepad2,
  Pill,
  Home,
  PawPrint,
  Receipt,
  type LucideIcon,
} from "@/components/ui/icons";

export const CATEGORIAS_GASTO = [
  { id: "mercado", label: "Mercado", icon: ShoppingCart },
  { id: "alimentacao", label: "Alimentação", icon: UtensilsCrossed },
  { id: "transporte", label: "Transporte", icon: Car },
  { id: "lazer", label: "Lazer", icon: Gamepad2 },
  { id: "saude", label: "Saúde", icon: Pill },
  { id: "casa", label: "Casa", icon: Home },
  { id: "pet", label: "Pet", icon: PawPrint },
  { id: "outros", label: "Outros", icon: Receipt },
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number]["id"];

export function categoriaIcon(id: string): LucideIcon {
  return CATEGORIAS_GASTO.find((c) => c.id === id)?.icon ?? Receipt;
}

export function categoriaLabel(id: string): string {
  return CATEGORIAS_GASTO.find((c) => c.id === id)?.label ?? id;
}
