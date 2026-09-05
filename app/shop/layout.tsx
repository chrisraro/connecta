"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ChevronRight, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CONNECTA } from "@/lib/brand";

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
        breadcrumbs.push({ label: "Cart", href: "/shop/cart" });
      } else if (paths[shopIndex + 1] === "checkout") {
        breadcrumbs.push({ label: "Shop", href: "/shop" });
        breadcrumbs.push({ label: "Checkout", href: "/shop/checkout" });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-background">
      {/* Shop Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex min-h-11 items-center gap-2 font-bold text-xl tracking-tight"
              >
                {CONNECTA.name}
              </Link>

              <nav className="hidden md:flex items-center gap-1" aria-label="Shop">
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shop
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Categories
                </Link>
              </nav>
            </div>

            {/* Account + Cart */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Your account"
                asChild
              >
                <Link href="/dashboard">
                  <User className="w-5 h-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-11"
                aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                asChild
              >
                <Link href="/shop/cart">
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground">
                      {itemCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="bg-muted/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="inline-flex min-h-11 min-w-11 items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Trust strip */}
      <div className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-center text-xs font-medium text-muted-foreground sm:px-6 lg:px-8">
          <span>GCash, Maya, Card &amp; QR Ph accepted</span>
          <span aria-hidden="true" className="hidden sm:inline">
            &bull;
          </span>
          <span>Ships nationwide PH</span>
          <span aria-hidden="true" className="hidden sm:inline">
            &bull;
          </span>
          <span>Secure checkout via PayRex</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-2">About {CONNECTA.name}</h3>
              <p className="text-sm text-muted-foreground">
                Premium NFC-enabled digital business cards and portfolio solutions.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Shop</h3>
              <div className="-my-1">
                <Link
                  href="/shop"
                  className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
                <Link
                  href="/shop/cart"
                  className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shopping Cart
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Support</h3>
              <div className="-my-1">
                <Link
                  href="/"
                  className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
                <Link
                  href="/"
                  className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shipping Info
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {CONNECTA.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
