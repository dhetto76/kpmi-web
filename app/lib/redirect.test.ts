import test from "node:test";
import assert from "node:assert/strict";
import { safeRedirect } from "./redirect.ts";

test("allows in-app absolute paths", () => {
  assert.equal(safeRedirect("/dashboard/produk"), "/dashboard/produk");
  assert.equal(safeRedirect("/admin"), "/admin");
  assert.equal(safeRedirect("/bisnis?q=kopi"), "/bisnis?q=kopi");
});

test("falls back when there is nothing usable", () => {
  assert.equal(safeRedirect(null), "/dashboard");
  assert.equal(safeRedirect(undefined), "/dashboard");
  assert.equal(safeRedirect(""), "/dashboard");
  assert.equal(safeRedirect("/", "/beranda"), "/");
  assert.equal(safeRedirect(null, "/beranda"), "/beranda");
});

test("rejects off-site destinations", () => {
  // Absolute URLs.
  assert.equal(safeRedirect("https://evil.example"), "/dashboard");
  assert.equal(safeRedirect("http://evil.example/x"), "/dashboard");
  // Protocol-relative — browsers treat this as absolute.
  assert.equal(safeRedirect("//evil.example"), "/dashboard");
  // Backslash variant some parsers normalise to "//".
  assert.equal(safeRedirect("/\\evil.example"), "/dashboard");
  // Scheme-like payloads.
  assert.equal(safeRedirect("javascript:alert(1)"), "/dashboard");
  assert.equal(safeRedirect("mailto:a@b.c"), "/dashboard");
  // Relative paths are not obviously safe to resolve; require a leading slash.
  assert.equal(safeRedirect("dashboard"), "/dashboard");
});

test("ignores non-string FormData values", () => {
  // `formData.get()` returns File for file inputs.
  assert.equal(safeRedirect(new File([], "x.txt") as unknown as FormDataEntryValue), "/dashboard");
});
