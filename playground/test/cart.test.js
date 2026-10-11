import { test } from "node:test";
import assert from "node:assert/strict";
import { subtotal, shipping, orderTotal } from "../src/cart.js";

const mug = { name: "Mug", price: 1250, quantity: 1 };
const tee = { name: "T-shirt", price: 2500, quantity: 1 };

test("subtotal adds price times quantity", () => {
  assert.equal(subtotal([mug, { ...tee, quantity: 2 }]), 6250);
});

test("an empty cart costs nothing", () => {
  assert.equal(orderTotal([]), 0);
});

test("small orders pay shipping", () => {
  assert.equal(shipping([mug]), 499);
});

test("shipping is free at exactly 50.00", () => {
  const cart = [{ ...mug, quantity: 2 }, tee]; // 12.50 * 2 + 25.00 = 50.00
  assert.equal(shipping(cart), 0);
});

test("order total includes shipping", () => {
  assert.equal(orderTotal([mug]), 1749);
});
