import { describe, it, expect } from "vitest";
import { getEligibleDiscountDishes, pickRandomDiscountDish } from "./idleDiscount";

const dishes = [
  { id: 1, name: "Bruschetta", category: "Starters" },
  { id: 2, name: "Soup", category: "Starters" },
  { id: 5, name: "Classic Burger", category: "Mains" },
  { id: 7, name: "Margherita Pizza", category: "Mains" },
  { id: 10, name: "Chocolate Lava Cake", category: "Desserts" },
  { id: 11, name: "Crème Brûlée", category: "Desserts" },
];

function cartItem(dishId, category) {
  return { dishId, category };
}

describe("getEligibleDiscountDishes", () => {
  it("returns every dish when the cart is empty", () => {
    const eligible = getEligibleDiscountDishes(dishes, []);
    expect(eligible).toHaveLength(dishes.length);
  });

  it("excludes dishes already in the cart", () => {
    const cart = [cartItem(1, "Starters")];
    const eligible = getEligibleDiscountDishes(dishes, cart);
    expect(eligible.find((d) => d.id === 1)).toBeUndefined();
  });

  it("excludes every dish sharing a category already present in the cart", () => {
    const cart = [cartItem(5, "Mains")];
    const eligible = getEligibleDiscountDishes(dishes, cart);
    expect(eligible.some((d) => d.category === "Mains")).toBe(false);
    expect(eligible.some((d) => d.category === "Starters")).toBe(true);
    expect(eligible.some((d) => d.category === "Desserts")).toBe(true);
  });

  it("only leaves desserts eligible when the cart has starters and mains", () => {
    const cart = [cartItem(1, "Starters"), cartItem(5, "Mains")];
    const eligible = getEligibleDiscountDishes(dishes, cart);
    expect(eligible.every((d) => d.category === "Desserts")).toBe(true);
    expect(eligible.length).toBeGreaterThan(0);
  });

  it("returns nothing when every category is already represented in the cart", () => {
    const cart = [cartItem(1, "Starters"), cartItem(5, "Mains"), cartItem(10, "Desserts")];
    const eligible = getEligibleDiscountDishes(dishes, cart);
    expect(eligible).toEqual([]);
  });
});

describe("pickRandomDiscountDish", () => {
  it("returns null when nothing is eligible", () => {
    const cart = [cartItem(1, "Starters"), cartItem(5, "Mains"), cartItem(10, "Desserts")];
    expect(pickRandomDiscountDish(dishes, cart)).toBeNull();
  });

  it("deterministically picks by index using the injected random function", () => {
    const eligible = getEligibleDiscountDishes(dishes, []);
    const last = pickRandomDiscountDish(dishes, [], () => 0.999999);
    expect(last).toEqual(eligible[eligible.length - 1]);

    const first = pickRandomDiscountDish(dishes, [], () => 0);
    expect(first).toEqual(eligible[0]);
  });

  it("never picks a dish from a category already in the cart", () => {
    const cart = [cartItem(1, "Starters"), cartItem(5, "Mains")];
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      const pick = pickRandomDiscountDish(dishes, cart, () => random);
      expect(pick.category).toBe("Desserts");
    }
  });
});
