// Idle-discount mechanic: after IDLE_MS of no user activity, one dish not
// already in the cart gets a DISCOUNT_RATE price cut. If the cart already
// has items, the picked dish must be from a category not yet in the cart
// (e.g. cart has starters/mains -> only desserts are eligible).

export const DISCOUNT_RATE = 0.1;
export const IDLE_MS = 10000;

export function getEligibleDiscountDishes(dishes, cart) {
  const orderedDishIds = new Set(cart.map((item) => item.dishId));
  const cartCategories = new Set(cart.map((item) => item.category));
  return dishes.filter((dish) => {
    if (orderedDishIds.has(dish.id)) return false;
    if (cartCategories.size > 0 && cartCategories.has(dish.category)) return false;
    return true;
  });
}

export function pickRandomDiscountDish(dishes, cart, random = Math.random) {
  const eligible = getEligibleDiscountDishes(dishes, cart);
  if (eligible.length === 0) return null;
  const index = Math.floor(random() * eligible.length);
  return eligible[index];
}
