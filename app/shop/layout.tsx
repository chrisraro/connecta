"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Home, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                TapFolio
              </Link>
              
              <nav className="hidden md:flex items-center gap-4">
                <Link 
                  href="/shop" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shop
                </Link>
                <Link 
                  href="/shop" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Categories
                </Link>
              </nav>
            </div>

            {/* Cart Icon */}
            <Link href="/shop/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="bg-muted/30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-2">About TapFolio</h3>
              <p className="text-sm text-muted-foreground">
                Premium NFC-enabled digital business cards and portfolio solutions.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Shop</h3>
              <div className="space-y-1">
                <Link href="/shop" className="block text-sm text-muted-foreground hover:text-foreground">
                  All Products
                </Link>
                <Link href="/shop/cart" className="block text-sm text-muted-foreground hover:text-foreground">
                  Shopping Cart
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Support</h3>
              <div className="space-y-1">
                <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
                <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">
                  Shipping Info
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} TapFolio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
