"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface CartItem {
  productId: Id<"products">;
  variationId?: Id<"productVariations">;
  quantity: number;
  priceAtAdd: number;
  product?: any;
  variation?: any;
  lineTotal?: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  addItem: (productId: Id<"products">, variationId: Id<"productVariations"> | undefined, quantity: number) => Promise<void>;
  removeItem: (productId: Id<"products">, variationId: Id<"productVariations"> | undefined) => Promise<void>;
  updateQuantity: (productId: Id<"products">, variationId: Id<"productVariations"> | undefined, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to generate/retrieve guest ID
function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  
  let guestId = localStorage.getItem("tapfolio_guest_cart_id");
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("tapfolio_guest_cart_id", guestId);
  }
  return guestId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  
  const guestId = isClientLoaded ? getOrCreateGuestId() : "";
  
  // Fetch cart from Convex
  const cart = useQuery(
    api.shop.getCart,
    user?.id 
      ? { clerkId: user.id }
      : guestId 
        ? { guestId }
        : "skip"
  );

  const addToCart = useMutation(api.shop.addToCart);
  const updateCartItem = useMutation(api.shop.updateCartItem);
  const removeFromCartMutation = useMutation(api.shop.removeFromCart);
  const clearCartMutation = useMutation(api.shop.clearCart);
  const mergeGuestCart = useMutation(api.shop.mergeGuestCart);

  useEffect(() => {
    setTimeout(() => {
      setIsClientLoaded(true);
    }, 0);
  }, []);

  // Merge guest cart when user logs in
  useEffect(() => {
    if (isLoaded && user && guestId) {
      mergeGuestCart({
        clerkId: user.id,
        guestId,
      }).catch(err => {
        console.error("Failed to merge guest cart:", err);
      });
    }
  }, [isLoaded, user, guestId, mergeGuestCart]);

  const addItem = useCallback(async (
    productId: Id<"products">,
    variationId: Id<"productVariations"> | undefined,
    quantity: number
  ) => {
    try {
      await addToCart({
        clerkId: user?.id,
        guestId: user?.id ? undefined : guestId,
        productId,
        variationId,
        quantity,
      });
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      throw error;
    }
  }, [user, guestId, addToCart]);

  const removeItem = useCallback(async (
    productId: Id<"products">,
    variationId: Id<"productVariations"> | undefined
  ) => {
    try {
      await removeFromCartMutation({
        clerkId: user?.id,
        guestId: user?.id ? undefined : guestId,
        productId,
        variationId,
      });
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      throw error;
    }
  }, [user, guestId, removeFromCartMutation]);

  const updateQuantity = useCallback(async (
    productId: Id<"products">,
    variationId: Id<"productVariations"> | undefined,
    quantity: number
  ) => {
    try {
      await updateCartItem({
        clerkId: user?.id,
        guestId: user?.id ? undefined : guestId,
        productId,
        variationId,
        quantity,
      });
    } catch (error) {
      console.error("Failed to update cart item:", error);
      throw error;
    }
  }, [user, guestId, updateCartItem]);

  const clearCart = useCallback(async () => {
    try {
      await clearCartMutation({
        clerkId: user?.id,
        guestId: user?.id ? undefined : guestId,
      });
    } catch (error) {
      console.error("Failed to clear cart:", error);
      throw error;
    }
  }, [user, guestId, clearCartMutation]);

  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isLoading: cart === undefined,
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
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
