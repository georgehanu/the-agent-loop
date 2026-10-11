// Prices are stored in cents to avoid floating point surprises.
export function formatPrice(cents) {
  return (cents / 100).toFixed(2);
}
