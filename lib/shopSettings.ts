/**
 * Storefront tax and shipping configuration.
 *
 * Lifted out of the Convex module so both the admin form and any storefront
 * reader share one definition. The values are centavos, matching every other
 * money field in the product.
 *
 * NOTE: with the payment gateway removed these no longer compute an order
 * total -- the cart is an inquiry basket. They remain because the storefront
 * still quotes them, and because reinstating checkout should not mean
 * re-deriving the numbers.
 */
export type ShopSettings = {
  taxRatePercent: number;
  shippingFlatRateCentavos: number;
  freeShippingThresholdCentavos: number;
  currency: "PHP";
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  taxRatePercent: 0,
  shippingFlatRateCentavos: 0,
  freeShippingThresholdCentavos: 0,
  currency: "PHP",
};
