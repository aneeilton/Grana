"use client";

import type { InputHTMLAttributes } from "react";

/** "1726.5" -> "1.726,50"; vazio continua vazio. */
function exibir(valor: string): string {
  if (valor === "") return valor;
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de dinheiro no formato brasileiro (1.726,00), digitando como
 * maquininha: os dígitos entram pelos centavos (1 → 0,01, 17 → 0,17,
 * 172600 → 1.726,00). Um "-" em qualquer lugar deixa o valor negativo.
 *
 * value/onValueChange usam o mesmo texto de antes ("1726.00", com ponto)
 * -- quem salva continua fazendo Number(valor) sem mudar nada.
 */
export function MoneyInput({
  value,
  onValueChange,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (valor: string) => void;
}) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={exibir(value)}
      onChange={(e) => {
        const texto = e.target.value;
        const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
        const negativo = texto.includes("-");
        if (!digitos) return onValueChange("");
        const valor = (Number(digitos) / 100).toFixed(2);
        onValueChange(negativo ? `-${valor}` : valor);
      }}
    />
  );
}
