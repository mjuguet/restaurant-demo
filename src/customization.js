// Ingredient customization for dishes that declare an `ingredients` list
// (see data.js). Other dishes are not customizable at all.

const DEFAULT_QUANTITY = 1;
const BUN_INGREDIENT = "Bun";
const EASTER_EGG_DISH = "Classic Burger";

export function isCustomizable(dish) {
  return Array.isArray(dish.ingredients) && dish.ingredients.length > 0;
}

export function createDefaultCustomization(dish) {
  return Object.fromEntries(dish.ingredients.map((name) => [name, DEFAULT_QUANTITY]));
}

// A customization only "counts" once at least one ingredient differs from
// its default quantity of 1 — an untouched modal confirmation behaves like
// a plain add.
export function isDefaultCustomization(dish, customization) {
  if (!customization) return true;
  return dish.ingredients.every((name) => (customization[name] ?? DEFAULT_QUANTITY) === DEFAULT_QUANTITY);
}

export function describeCustomization(dish, customization) {
  if (!customization) return [];
  return dish.ingredients
    .filter((name) => (customization[name] ?? DEFAULT_QUANTITY) !== DEFAULT_QUANTITY)
    .map((name) => {
      const count = customization[name] ?? DEFAULT_QUANTITY;
      return count === 0 ? `No ${name}` : `Extra ${name} ×${count}`;
    });
}

// Easter egg: every ingredient removed except the bun.
export function isBunOnlyBurger(dish, customization) {
  if (dish.name !== EASTER_EGG_DISH || !customization) return false;
  const bunCount = customization[BUN_INGREDIENT] ?? DEFAULT_QUANTITY;
  if (bunCount <= 0) return false;
  return dish.ingredients
    .filter((name) => name !== BUN_INGREDIENT)
    .every((name) => (customization[name] ?? DEFAULT_QUANTITY) === 0);
}
