/**
 * Query keys for TanStack Query.
 *
 * Centralised because invalidation is the whole reactivity story now. Convex
 * re-rendered every dependent view on write with no code at all; here a
 * mutation has to say which reads it invalidated, and a key typo means a view
 * silently keeps showing stale data. Keys built by hand at each call site make
 * that typo easy and invisible, so they are all defined once, here.
 */
export const queryKeys = {
  currentUser: () => ["currentUser"] as const,
  isAdmin: () => ["isAdmin"] as const,

  myCards: () => ["cards", "mine"] as const,
  cardByUuid: (uuid: string) => ["cards", "byUuid", uuid] as const,

  myProfiles: () => ["profiles", "mine"] as const,
  profile: (id: string) => ["profiles", id] as const,
  profileBySlug: (slug: string) => ["profiles", "slug", slug] as const,

  myLeads: () => ["leads", "mine"] as const,
  myNotifications: () => ["notifications", "mine"] as const,

  myProperties: () => ["properties", "mine"] as const,
  myProjects: () => ["projects", "mine"] as const,

  products: (filter?: string) => ["products", filter ?? "all"] as const,
  productBySlug: (slug: string) => ["products", "slug", slug] as const,
  productCategories: () => ["productCategories"] as const,
  myCart: () => ["cart", "mine"] as const,

  adminUsers: (search?: string) => ["admin", "users", search ?? ""] as const,
  adminCards: (status?: string) => ["admin", "cards", status ?? "all"] as const,
  adminAudit: () => ["admin", "audit"] as const,
  adminStats: () => ["admin", "stats"] as const,

  settings: (key: string) => ["settings", key] as const,
  myTeam: () => ["team", "mine"] as const,
} as const;
