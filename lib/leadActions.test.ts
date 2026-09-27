import { expect, test } from "vitest";
import { leadStatusActions } from "./leadActions";

// B13 (backlog 2026-09-25): a Closed filter existed but nothing could close a
// lead, and delete was never offered.
test("each status offers the next sensible moves, and delete is always there", () => {
  expect(leadStatusActions("new")).toEqual(["contacted", "closed", "delete"]);
  expect(leadStatusActions("contacted")).toEqual(["closed", "delete"]);
  expect(leadStatusActions("closed")).toEqual(["reopen", "delete"]);
});
