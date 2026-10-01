/**
 * The public site (homepage, shop, legal pages) is drawn on the light
 * whiteprint sheet only (owner decision 2026-10-01); the dashboard, admin,
 * auth and public profiles keep the user's light/dark choice.
 */
export function isLightOnlyRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/")
  );
}
