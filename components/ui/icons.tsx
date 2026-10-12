import type { ComponentType, SVGProps } from "react";
import {
  ArrowCounterClockwise,
  ArrowDownRight as PhArrowDownRight,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise,
  ArrowsLeftRight,
  Bank,
  CalendarDots,
  Car as PhCar,
  CaretDown as PhCaretDown,
  CaretLeft,
  CaretRight,
  Check as PhCheck,
  Confetti,
  CreditCard as PhCreditCard,
  Diamond,
  Eye as PhEye,
  EyeSlash,
  Flask,
  ForkKnife,
  GameController,
  Gavel as PhGavel,
  House as PhHouse,
  Invoice,
  PawPrint as PhPawPrint,
  PencilSimple,
  PiggyBank as PhPiggyBank,
  Pill as PhPill,
  Pulse,
  Receipt as PhReceipt,
  Repeat as PhRepeat,
  SealCheck,
  ShieldCheck as PhShieldCheck,
  ShoppingCart as PhShoppingCart,
  Sparkle,
  SquaresFour,
  Star as PhStar,
  Trash,
  TrendUp,
  Warning,
  WarningOctagon,
  Wallet as PhWallet,
  X as PhX,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhIcon, IconWeight } from "@phosphor-icons/react";

/**
 * Ícones no estilo SF Symbols (Phosphor -- os SF Symbols da Apple não podem
 * ser usados na web). O app continua chamando os ícones pelos nomes de
 * antes; aqui cada nome aponta pro desenho Phosphor equivalente.
 *
 * Peso: `weight` explícito vence; `fill` (ex: estrela marcada) vira
 * preenchido; senão um traço mais grosso (strokeWidth >= 2.4) vira "bold"
 * e o resto fica "regular" -- o equivalente ao peso padrão dos símbolos.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number;
  strokeWidth?: number;
  weight?: IconWeight;
};

export type LucideIcon = ComponentType<IconProps>;

function wrap(C: PhIcon, nome: string): LucideIcon {
  function Icone({ strokeWidth, fill, weight, size = 20, ...rest }: IconProps) {
    const peso: IconWeight =
      weight ?? (fill && fill !== "none" ? "fill" : strokeWidth && strokeWidth >= 2.4 ? "bold" : "regular");
    return <C size={size} weight={peso} {...(rest as Record<string, unknown>)} />;
  }
  Icone.displayName = nome;
  return Icone;
}

export const Activity = wrap(Pulse, "Activity");
export const ArrowDownRight = wrap(PhArrowDownRight, "ArrowDownRight");
export const ArrowLeftRight = wrap(ArrowsLeftRight, "ArrowLeftRight");
export const ArrowUpRight = wrap(PhArrowUpRight, "ArrowUpRight");
export const BadgeCheck = wrap(SealCheck, "BadgeCheck");
export const CalendarRange = wrap(CalendarDots, "CalendarRange");
export const Car = wrap(PhCar, "Car");
export const CarFront = wrap(PhCar, "CarFront");
export const CaretDown = wrap(PhCaretDown, "CaretDown");
export const Check = wrap(PhCheck, "Check");
export const ChevronLeft = wrap(CaretLeft, "ChevronLeft");
export const ChevronRight = wrap(CaretRight, "ChevronRight");
export const CreditCard = wrap(PhCreditCard, "CreditCard");
export const Eye = wrap(PhEye, "Eye");
export const EyeOff = wrap(EyeSlash, "EyeOff");
export const FileWarning = wrap(Invoice, "FileWarning");
export const FlaskConical = wrap(Flask, "FlaskConical");
export const Gamepad2 = wrap(GameController, "Gamepad2");
export const Gavel = wrap(PhGavel, "Gavel");
export const Gem = wrap(Diamond, "Gem");
export const Home = wrap(PhHouse, "Home");
export const House = wrap(PhHouse, "House");
export const Landmark = wrap(Bank, "Landmark");
export const LayoutGrid = wrap(SquaresFour, "LayoutGrid");
export const OctagonAlert = wrap(WarningOctagon, "OctagonAlert");
export const PartyPopper = wrap(Confetti, "PartyPopper");
export const PawPrint = wrap(PhPawPrint, "PawPrint");
export const Pencil = wrap(PencilSimple, "Pencil");
export const PiggyBank = wrap(PhPiggyBank, "PiggyBank");
export const Pill = wrap(PhPill, "Pill");
export const Receipt = wrap(PhReceipt, "Receipt");
export const RefreshCw = wrap(ArrowsClockwise, "RefreshCw");
export const Repeat = wrap(PhRepeat, "Repeat");
export const RotateCcw = wrap(ArrowCounterClockwise, "RotateCcw");
export const ShieldCheck = wrap(PhShieldCheck, "ShieldCheck");
export const ShoppingCart = wrap(PhShoppingCart, "ShoppingCart");
export const Sparkles = wrap(Sparkle, "Sparkles");
export const Star = wrap(PhStar, "Star");
export const Trash2 = wrap(Trash, "Trash2");
export const TrendingUp = wrap(TrendUp, "TrendingUp");
export const TriangleAlert = wrap(Warning, "TriangleAlert");
export const UtensilsCrossed = wrap(ForkKnife, "UtensilsCrossed");
export const Wallet = wrap(PhWallet, "Wallet");
export const X = wrap(PhX, "X");
