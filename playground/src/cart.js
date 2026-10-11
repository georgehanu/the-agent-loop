export const FREE_SHIPPING_FROM = 5000; // cents
export const SHIPPING_COST = 499; // cents

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function shipping(items) {
  if (items.length === 0) return 0;
  return subtotal(items) > FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
}

export function orderTotal(items) {
  return subtotal(items) + shipping(items);
}
