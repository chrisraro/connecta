"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { SITE_CONTAINER, SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import survey from "@/components/survey/survey.module.css";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Home", href: "/" }];

    if (paths.includes("shop")) {
      const shopIndex = paths.indexOf("shop");

      if (shopIndex === paths.length - 1) {
        breadcrumbs.push({ label: "Shop", href: "/shop" });
      } else if (paths[shopIndex + 1] === "product") {
        breadcrumbs.push({ label: "Shop", href: "/shop" });
        breadcrumbs.push({ label: "Product", href: pathname });
      } else if (paths[shopIndex + 1] === "cart") {
        breadcrumbs.push({ label: "Shop", href: "/shop" });
        breadcrumbs.push({ label: "Your Selection", href: "/shop/cart" });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader
        actions={
          <Link
            href="/shop/cart"
            className={`${survey.cell} relative flex size-11 items-center justify-center`}
            aria-label={`Your selection, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span
                className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center px-1 text-xs font-bold"
                style={{ backgroundColor: "var(--sv-action-bg)", color: "var(--sv-action-ink)" }}
              >
                {itemCount}
              </span>
            )}
          </Link>
        }
      />

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="border-b border-border">
          <nav className={`${SITE_CONTAINER} flex items-center gap-2 text-sm`} aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="inline-flex min-h-11 min-w-11 items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}

      <main className={`${SITE_CONTAINER} py-10`}>{children}</main>

      <SiteFooter />
    </div>
  );
}
