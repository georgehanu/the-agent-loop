import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../src/money.js";

test("formats cents as a price", () => {
  assert.equal(formatPrice(1749), "17.49");
  assert.equal(formatPrice(5000), "50.00");
});
