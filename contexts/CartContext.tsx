"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSupabase } from "@/lib/db/client";
import { useProductsByIds, type Product, type ProductVariation } from "@/hooks/useShop";
import { queryKeys } from "@/lib/db/keys";

/** What is actually stored: ids and the price at the time it was added. */
export interface CartLine {
  productId: string;
  variationId?: string | null;
  quantity: number;
  priceAtAdd: number;
}

/** A line joined to its product, for rendering. */
export interface CartItem extends CartLine {
  product?: Product | null;
  variation?: ProductVariation | null;
  lineTotal?: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  addItem: (productId: string, variationId: string | undefined, quantity: number) => Promise<void>;
  removeItem: (productId: string, variationId: string | undefined) => Promise<void>;
  updateQuantity: (
    productId: string,
    variationId: string | undefined,
    quantity: number,
  ) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_KEY = "connecta_guest_cart";

/**
 * CARVE-OUT (migration, 2026-09-11): a signed-out basket lives in
 * localStorage and never touches the database.
 *
 * Convex stored guest carts server-side, keyed by a token the browser minted
 * itself. Under RLS that is unprotectable: a self-issued, guessable,
 * unauthenticated identifier cannot be checked against anything, so honouring
 * it would mean an open table with a naming convention in front of it.
 *
 * It also buys nothing any more. With the payment gateway removed the basket
 * produces an inquiry email and nothing else, so there is no order to
 * reconcile and no reason for it to outlive the browser it was built in.
 */
function readLocalCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    // Private mode, cleared storage, or a value written by an older version.
    // An unreadable basket is an empty basket, never a crash on first paint.
    return [];
  }
}

function writeLocalCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(lines));
  } catch {
    // Storage can be full or blocked. The in-memory basket still works for
    // this session, which is better than failing the add.
  }
}

function sameLine(a: CartLine, productId: string, variationId?: string | null) {
  return a.productId === productId && (a.variationId ?? null) === (variationId ?? null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Local first, always: it is synchronous and avoids an empty-basket flash
  // on the very first paint.
  useEffect(() => {
    setLines(readLocalCart());
    setHydrated(true);
  }, []);

  // Once signed in, load the row and MERGE the local basket into it. Merging
  // rather than replacing matters: somebody who added items, signed in, and
  // had that silently discard what was already saved would lose work with no
  // way to get it back.
  useEffect(() => {
    if (!isLoaded || !user || !hydrated) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("carts")
        .select("items")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;

      const remote = (data?.items as unknown as CartLine[]) ?? [];
      const local = readLocalCart();

      if (local.length === 0) {
        setLines(remote);
        return;
      }

      const merged = [...remote];
      for (const line of local) {
        const existing = merged.find((m) => sameLine(m, line.productId, line.variationId));
        if (existing) existing.quantity += line.quantity;
        else merged.push(line);
      }

      setLines(merged);
      writeLocalCart([]);
      await supabase
        .from("carts")
        .upsert({ user_id: user.id, items: merged as never }, { onConflict: "user_id" });
      queryClient.invalidateQueries({ queryKey: queryKeys.myCart() });
    })();

    return () => {
      active = false;
    };
  }, [isLoaded, user, hydrated, supabase, queryClient]);

  const persist = useCallback(
    async (next: CartLine[]) => {
      setLines(next);
      if (user) {
        const { error } = await supabase
          .from("carts")
          .upsert({ user_id: user.id, items: next as never }, { onConflict: "user_id" });
        if (error) throw error;
      } else {
        writeLocalCart(next);
      }
    },
    [user, supabase],
  );

  const productIds = useMemo(() => Array.from(new Set(lines.map((l) => l.productId))), [lines]);
  const { data: catalog, isPending: catalogPending } = useProductsByIds(productIds);

  const items: CartItem[] = useMemo(() => {
    return lines.map((line) => {
      const product = catalog?.products.find((p) => p.id === line.productId) ?? null;
      const variation = line.variationId
        ? (catalog?.variations.find((v) => v.id === line.variationId) ?? null)
        : null;
      return {
        ...line,
        product,
        variation,
        lineTotal: line.priceAtAdd * line.quantity,
      };
    });
  }, [lines, catalog]);

  const addItem = useCallback(
    async (productId: string, variationId: string | undefined, quantity: number) => {
      const cached =
        (variationId
          ? catalog?.variations.find((v) => v.id === variationId)?.price
          : catalog?.products.find((p) => p.id === productId)?.base_price) ?? 0;

      // priceAtAdd is the price at the moment of adding. If the catalog is not
      // in cache yet it is fetched rather than stored as zero -- a basket of
      // apparently free items is far worse than a slightly slower add.
      let resolved = cached;
      if (!resolved) {
        if (variationId) {
          const { data } = await supabase
            .from("product_variations")
            .select("price")
            .eq("id", variationId)
            .maybeSingle();
          resolved = data?.price ?? 0;
        } else {
          const { data } = await supabase
            .from("products")
            .select("base_price")
            .eq("id", productId)
            .maybeSingle();
          resolved = data?.base_price ?? 0;
        }
      }

      const next = [...lines];
      const existing = next.find((l) => sameLine(l, productId, variationId));
      if (existing) {
        existing.quantity += quantity;
      } else {
        next.push({
          productId,
          variationId: variationId ?? null,
          quantity,
          priceAtAdd: resolved,
        });
      }

      await persist(next);
    },
    [lines, catalog, persist, supabase],
  );

  const removeItem = useCallback(
    async (productId: string, variationId: string | undefined) => {
      await persist(lines.filter((l) => !sameLine(l, productId, variationId)));
    },
    [lines, persist],
  );

  const updateQuantity = useCallback(
    async (productId: string, variationId: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        await persist(lines.filter((l) => !sameLine(l, productId, variationId)));
        return;
      }
      await persist(
        lines.map((l) => (sameLine(l, productId, variationId) ? { ...l, quantity } : l)),
      );
    },
    [lines, persist],
  );

  const clearCart = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isLoading: !hydrated || (productIds.length > 0 && catalogPending),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
