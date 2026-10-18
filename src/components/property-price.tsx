import type { PropertyPurpose } from "@/types/database";
import {
  bothPriceLabels,
  mainPriceLabel,
  secondaryPriceLabel,
} from "@/lib/properties/format";

/**
 * Exibição de preço reutilizável.
 * - variant="card" (padrão): preço principal + linha secundária DISCRETA com o
 *   outro preço, apenas quando existem os dois (venda e aluguel). Com um preço
 *   só, mostra exatamente o preço único atual (sem alterar os imóveis antigos).
 * - variant="detail": quando há os dois preços, mostra rotulado em duas linhas
 *   ("Venda: …" e "Aluguel: …/mês"); com um só, mantém o preço único atual.
 */
export function PropertyPrice({
  purpose,
  salePrice,
  rentPrice,
  className,
  variant = "card",
}: {
  purpose: PropertyPurpose;
  salePrice: number | null;
  rentPrice: number | null;
  className?: string;
  variant?: "card" | "detail";
}) {
  const primary = mainPriceLabel(purpose, salePrice, rentPrice);

  if (variant === "detail") {
    const both = bothPriceLabels(salePrice, rentPrice);
    if (!both) return <span className={className}>{primary}</span>;
    return (
      <span className={className}>
        <span className="block">{both.sale}</span>
        <span className="block">{both.rent}</span>
      </span>
    );
  }

  const secondary = secondaryPriceLabel(purpose, salePrice, rentPrice);
  if (!secondary) return <span className={className}>{primary}</span>;
  return (
    <span className={className}>
      <span className="block">{primary}</span>
      {/* Cor herdada + opacidade: discreto e legível tanto em fundo claro
          (cards) quanto em fundo escuro (vitrine do hero). */}
      <span className="block text-xs font-normal opacity-80 sm:text-sm">
        {secondary}
      </span>
    </span>
  );
}
