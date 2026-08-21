import { ExternalLink } from "lucide-react";
import { ProductItem } from "@/types/profile";
import { formatCatalogPrice } from "@/lib/payment";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

export function ProductsSection({ products, theme, index }: { products: ProductItem[]; theme: TemplateTheme; index: number }) {
  return (
    <SectionShell theme={theme} index={index} heading="Store" surface>
      <div className="space-y-4">
        {products.map((product, i) => (
          <div key={i} className="rounded-[var(--r-lg)] p-5" style={{ backgroundColor: theme.colors.background }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3
                  className="font-medium text-base"
                  style={{ fontFamily: `var(${theme.fontVars.display})`, color: theme.colors.ink }}
                >
                  {product.title}
                </h3>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.colors.inkSoft }}>{product.description}</p>
              </div>
              {product.price !== undefined && (
                <span className="text-lg font-medium ml-4 shrink-0" style={{ color: theme.colors.accent }}>{formatCatalogPrice(product.price)}</span>
              )}
            </div>
            {product.link && (
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 font-medium mt-3"
                style={{ color: theme.colors.accent }}
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
