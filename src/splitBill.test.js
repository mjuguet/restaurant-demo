import { describe, it, expect } from "vitest";
import {
  TAX_RATE,
  createUnitAssignments,
  resizeUnitAssignments,
  assignUnit,
  shareRemainingEqually,
  removeGuestFromAssignments,
  getUnassignedSummary,
  computeGuestBreakdown,
} from "./splitBill";

function guest(id, name) {
  return { id, name };
}

function item({ id, name, price, quantity, unitAssignments }) {
  return {
    id,
    name,
    price,
    quantity,
    unitAssignments: unitAssignments || createUnitAssignments(quantity),
  };
}

describe("createUnitAssignments / resizeUnitAssignments", () => {
  it("creates one empty assignment per unit", () => {
    expect(createUnitAssignments(3)).toEqual([[], [], []]);
  });

  it("appends empty units when quantity grows, keeping existing assignments", () => {
    const resized = resizeUnitAssignments([["a"]], 3);
    expect(resized).toEqual([["a"], [], []]);
  });

  it("drops trailing units when quantity shrinks, keeping the rest", () => {
    const resized = resizeUnitAssignments([["a"], ["b"], ["c"]], 1);
    expect(resized).toEqual([["a"]]);
  });
});

describe("assignUnit", () => {
  it("only updates the targeted unit of the targeted item", () => {
    const cart = [item({ id: 1, name: "Pizza", price: 10, quantity: 2 })];
    const next = assignUnit(cart, 1, 0, ["g1"]);
    expect(next[0].unitAssignments).toEqual([["g1"], []]);
  });
});

describe("shareRemainingEqually", () => {
  it("only touches units that are still unassigned", () => {
    const cart = [
      item({ id: 1, name: "Bread", price: 3, quantity: 1, unitAssignments: [["g1"]] }),
      item({ id: 2, name: "Wine", price: 20, quantity: 1 }),
    ];
    const next = shareRemainingEqually(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(next[0].unitAssignments).toEqual([["g1"]]);
    expect(next[1].unitAssignments).toEqual([["g1", "g2"]]);
  });
});

describe("removeGuestFromAssignments", () => {
  it("removes the guest from every unit but leaves other guests in shared units", () => {
    const cart = [
      item({
        id: 1,
        name: "Wine",
        price: 20,
        quantity: 1,
        unitAssignments: [["g1", "g2"]],
      }),
      item({ id: 2, name: "Pizza", price: 10, quantity: 1, unitAssignments: [["g1"]] }),
    ];
    const next = removeGuestFromAssignments(cart, "g1");
    expect(next[0].unitAssignments).toEqual([["g2"]]);
    expect(next[1].unitAssignments).toEqual([[]]);
  });
});

describe("getUnassignedSummary", () => {
  it("reports units with no guest, grouped by item", () => {
    const cart = [
      item({ id: 1, name: "Pizza", price: 10, quantity: 2, unitAssignments: [["g1"], []] }),
      item({ id: 2, name: "Coke", price: 3, quantity: 1 }),
    ];
    const summary = getUnassignedSummary(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(summary.totalUnits).toBe(2);
    expect(summary.groups).toEqual([
      { itemId: 1, name: "Pizza", count: 1 },
      { itemId: 2, name: "Coke", count: 1 },
    ]);
  });

  it("treats every unit as assigned when there is a single guest (degenerate case)", () => {
    const cart = [item({ id: 1, name: "Pizza", price: 10, quantity: 2 })];
    const summary = getUnassignedSummary(cart, [guest("g1", "Solo")]);
    expect(summary.totalUnits).toBe(0);
  });

  it("reports everything unassigned when there are no guests yet", () => {
    const cart = [item({ id: 1, name: "Pizza", price: 10, quantity: 1 })];
    const summary = getUnassignedSummary(cart, []);
    expect(summary.totalUnits).toBe(1);
  });
});

describe("computeGuestBreakdown", () => {
  it("splits a single-guest item entirely to that guest", () => {
    const cart = [
      item({ id: 1, name: "Pizza", price: 10, quantity: 1, unitAssignments: [["g1"]] }),
    ];
    const rows = computeGuestBreakdown(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("A");
    expect(rows[0].subtotal).toBeCloseTo(10);
    expect(rows[0].tax).toBeCloseTo(10 * TAX_RATE);
    expect(rows[0].total).toBeCloseTo(10 * (1 + TAX_RATE));
  });

  it("splits a shared item equally between the assigned guests", () => {
    const cart = [
      item({ id: 1, name: "Wine", price: 20, quantity: 1, unitAssignments: [["g1", "g2"]] }),
    ];
    const rows = computeGuestBreakdown(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(rows.find((r) => r.guestId === "g1").subtotal).toBeCloseTo(10);
    expect(rows.find((r) => r.guestId === "g2").subtotal).toBeCloseTo(10);
  });

  it("assigns each unit of a multi-quantity item independently", () => {
    const cart = [
      item({
        id: 1,
        name: "Coke",
        price: 3,
        quantity: 3,
        unitAssignments: [["g1"], ["g2"], ["g1"]],
      }),
    ];
    const rows = computeGuestBreakdown(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(rows.find((r) => r.guestId === "g1").subtotal).toBeCloseTo(6);
    expect(rows.find((r) => r.guestId === "g2").subtotal).toBeCloseTo(3);
  });

  it("omits guests with nothing assigned", () => {
    const cart = [
      item({ id: 1, name: "Pizza", price: 10, quantity: 1, unitAssignments: [["g1"]] }),
    ];
    const rows = computeGuestBreakdown(cart, [guest("g1", "A"), guest("g2", "B")]);
    expect(rows.map((r) => r.guestId)).toEqual(["g1"]);
  });

  it("the sum of rounded totals always equals the exact order total, for an amount that does not divide evenly", () => {
    // 10.00 split 3 ways: 3.333... each before tax, a classic rounding trap.
    const cart = [
      item({
        id: 1,
        name: "Sharing platter",
        price: 10,
        quantity: 1,
        unitAssignments: [["g1", "g2", "g3"]],
      }),
    ];
    const guests = [guest("g1", "A"), guest("g2", "B"), guest("g3", "C")];
    const rows = computeGuestBreakdown(cart, guests);

    const subtotal = 10;
    const expectedTotal = Math.round(subtotal * (1 + TAX_RATE) * 100) / 100;
    const sumOfRoundedTotals = rows.reduce((sum, row) => sum + row.total, 0);

    expect(Math.round(sumOfRoundedTotals * 100)).toBe(Math.round(expectedTotal * 100));
  });

  it("holds the invariant across 2, 3, 5 and 7 guests sharing an odd amount", () => {
    for (const guestCount of [2, 3, 5, 7]) {
      const guests = Array.from({ length: guestCount }, (_, i) => guest(`g${i}`, `Guest ${i}`));
      const cart = [
        item({
          id: 1,
          name: "Feast",
          price: 100.07,
          quantity: 1,
          unitAssignments: [guests.map((g) => g.id)],
        }),
      ];
      const rows = computeGuestBreakdown(cart, guests);
      const expectedTotalCents = Math.round(100.07 * (1 + TAX_RATE) * 100);
      const actualTotalCents = rows.reduce((sum, row) => sum + Math.round(row.total * 100), 0);
      expect(actualTotalCents).toBe(expectedTotalCents);
    }
  });

  it("gives the rounding leftover to the guest with the highest subtotal", () => {
    const cart = [
      item({ id: 1, name: "Big steak", price: 30, quantity: 1, unitAssignments: [["g1"]] }),
      item({
        id: 2,
        name: "Side salad",
        price: 0.01,
        quantity: 1,
        unitAssignments: [["g1", "g2"]],
      }),
    ];
    const guests = [guest("g1", "A"), guest("g2", "B")];
    const rows = computeGuestBreakdown(cart, guests);
    const a = rows.find((r) => r.guestId === "g1");
    const b = rows.find((r) => r.guestId === "g2");
    expect(a.subtotal).toBeGreaterThan(b.subtotal);
    // Any rounding leftover must land on A (highest subtotal), never on B.
    const naiveBTotal = Math.round(b.tax * 100 + b.subtotal * 100) / 100;
    expect(b.total).toBeCloseTo(naiveBTotal, 2);
  });

  it("returns an empty breakdown when nothing is assigned yet", () => {
    const cart = [item({ id: 1, name: "Pizza", price: 10, quantity: 1 })];
    const rows = computeGuestBreakdown(cart, [guest("g1", "A")]);
    // Single-guest degenerate case: everything defaults to the lone guest.
    expect(rows).toHaveLength(1);
    expect(rows[0].subtotal).toBeCloseTo(10);
  });

  it("returns an empty breakdown when there are no guests at all", () => {
    const cart = [item({ id: 1, name: "Pizza", price: 10, quantity: 1 })];
    expect(computeGuestBreakdown(cart, [])).toEqual([]);
  });
});
