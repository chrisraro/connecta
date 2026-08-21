export type CatalogItem = {
  type: "product" | "service";
  title: string;
  description: string;
  price?: number;
  image?: string;
  link?: string;
};

/**
 * The Storefront's service catalog, derived from `agentInfo.services` — the
 * ONLY authoritative source (audit-dataflow.md #1). A second, structured
 * "services" concept lives at the profile's top level
 * (`profiles.services: {title,description,price,image}[]`), but no editor
 * anywhere in the product ever wrote a real value to it — the builder's Save
 * always sent `[]` — so on every live row it is permanently empty. Reading
 * only `agentInfo.services` here means the Storefront no longer needs to
 * merge/de-duplicate two sources; there is exactly one.
 */
export function buildServiceCatalogItems(agent: {
  fullName: string;
  services?: string[];
}): CatalogItem[] {
  return (agent.services || []).map((title) => ({
    type: "service" as const,
    title,
    description: `${title} offered by ${agent.fullName}`,
  }));
}
