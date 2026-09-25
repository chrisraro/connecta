import { describe, expect, test } from "vitest";
import { csvCell, toCsv } from "./csv";

// B11 (backlog 2026-09-25): lead export wrote visitor-supplied text straight
// into cells. A value starting with = + - @ (or a tab / carriage return) runs
// as a formula when the file is opened in Excel or Sheets. OWASP's guidance:
// quote every cell and prefix those values with an apostrophe.
describe("csvCell", () => {
  test.each(["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])(
    "neutralises a formula-looking value %j",
    (v) => {
      expect(csvCell(v).startsWith(`"'`)).toBe(true);
    },
  );

  test("keeps a Philippine mobile number readable", () => {
    expect(csvCell("+639171234567")).toBe(`"'+639171234567"`);
  });

  test("quotes and doubles embedded quotes", () => {
    expect(csvCell('Juan "JD" Cruz')).toBe(`"Juan ""JD"" Cruz"`);
  });

  test("leaves ordinary text alone", () => {
    expect(csvCell("juan@example.com")).toBe(`"juan@example.com"`);
  });
});

test("toCsv joins cells with commas and rows with CRLF", () => {
  expect(toCsv([["a", "b"], ["=1", "c"]])).toBe(`"a","b"\r\n"'=1","c"`);
});
