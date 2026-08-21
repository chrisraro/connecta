import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildServiceCatalogItems } from "./serviceCatalog";

/**
 * Task 13 / audit-dataflow #1 — the Storefront used to merge TWO "services"
 * concepts: `profiles.services` (a structured title/description/price
 * catalog with no editor anywhere in the product — every builder save
 * hardcoded it to `[]`) and `agent.services` (the simple string tags the
 * builder's actual "Services" panel writes). Live data confirmed the
 * top-level field is empty on 100% of rows, so the merge/de-dupe-by-title
 * logic in StorefrontView existed purely to combine a real source with a
 * permanently-empty one. `agent.services` is the one authoritative,
 * populated source — this is the pure function that derives the
 * Storefront's service catalog from it alone.
 */

test("builds one catalog item per service tag, described as offered by the person", () => {
  const items = buildServiceCatalogItems({
    fullName: "Jane Doe",
    services: ["Logo Design", "Web Design"],
  });

  expect(items).toEqual([
    { type: "service", title: "Logo Design", description: "Logo Design offered by Jane Doe" },
    { type: "service", title: "Web Design", description: "Web Design offered by Jane Doe" },
  ]);
});

test("returns an empty catalog when there are no service tags", () => {
  expect(buildServiceCatalogItems({ fullName: "Jane Doe", services: [] })).toEqual([]);
  expect(buildServiceCatalogItems({ fullName: "Jane Doe" })).toEqual([]);
});

// Task 13 item 3 — the builder used to hardcode `services: []` into every
// createProfile call, permanently overwriting the top-level catalog field on
// every single save even though no editor in the product could ever put a
// real value there. That's "pretending to populate it": sending an explicit
// empty value every time implies there's something being managed, when
// there never was. The fix removes the write entirely — the field stays
// declared in the schema (full removal needs a compat/backfill plan outside
// this task's scope) but the builder simply stops touching it.
test("the builder's Save no longer hardcodes the dead top-level services field", () => {
  const src = readFileSync(
    join(process.cwd(), "app", "dashboard", "builder", "page.tsx"),
    "utf8"
  );

  const saveIdx = src.indexOf("const handleSave");
  expect(saveIdx, "handleSave not found").toBeGreaterThan(-1);
  const createProfileIdx = src.indexOf("await createProfile(", saveIdx);
  expect(createProfileIdx, "createProfile call not found inside handleSave").toBeGreaterThan(-1);
  const closingIdx = src.indexOf("});", createProfileIdx);
  const createProfileCall = src.slice(createProfileIdx, closingIdx);

  expect(
    createProfileCall,
    "handleSave must not send a hardcoded `services: []` — see lib/serviceCatalog.ts for the authoritative source"
  ).not.toMatch(/\bservices:\s*\[\]/);
});
