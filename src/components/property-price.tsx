import type { PropertyPurpose } from "@/types/database";
import { mainPriceLabel } from "@/lib/properties/format";

export function PropertyPrice({
  purpose,
  salePrice,
  rentPrice,
  className,
}: {
  purpose: PropertyPurpose;
  salePrice: number | null;
  rentPrice: number | null;
  className?: string;
}) {
  return (
    <span className={className}>
      {mainPriceLabel(purpose, salePrice, rentPrice)}
    </span>
  );
}
