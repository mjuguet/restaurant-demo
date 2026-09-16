// Split-bill logic: assigning cart item units to guests, and computing each
// guest's share (subtotal, tax, total) so the sum always matches the order
// total exactly, per spec-partage-addition-groupe.md.

export const TAX_RATE = 0.2;

export function makeGuestId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createUnitAssignments(quantity) {
  return Array.from({ length: quantity }, () => []);
}

// Keeps existing per-unit assignments when a line's quantity changes,
// appending unassigned units or dropping trailing ones.
export function resizeUnitAssignments(unitAssignments, quantity) {
  if (quantity === unitAssignments.length) return unitAssignments;
  if (quantity > unitAssignments.length) {
    return [
      ...unitAssignments,
      ...Array.from({ length: quantity - unitAssignments.length }, () => []),
    ];
  }
  return unitAssignments.slice(0, quantity);
}

export function assignUnit(cart, itemId, unitIndex, guestIds) {
  return cart.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      unitAssignments: item.unitAssignments.map((assignment, index) =>
        index === unitIndex ? guestIds : assignment
      ),
    };
  });
}

// "Share equitably between everyone" quick action for table items (bread,
// cutlery...): only touches units that are still unassigned.
export function shareRemainingEqually(cart, guests) {
  const guestIds = guests.map((g) => g.id);
  if (guestIds.length === 0) return cart;
  return cart.map((item) => ({
    ...item,
    unitAssignments: item.unitAssignments.map((assignment) =>
      assignment.length === 0 ? guestIds : assignment
    ),
  }));
}

export function removeGuestFromAssignments(cart, guestId) {
  return cart.map((item) => ({
    ...item,
    unitAssignments: item.unitAssignments.map((assignment) =>
      assignment.filter((id) => id !== guestId)
    ),
  }));
}

export function resetAssignments(cart) {
  return cart.map((item) => ({
    ...item,
    unitAssignments: createUnitAssignments(item.quantity),
  }));
}

// Degenerate single-guest case: everything not explicitly assigned defaults
// to the lone guest, so split mode behaves like a normal bill.
function effectiveAssignment(assignment, guests) {
  if (assignment.length > 0) return assignment;
  return guests.length === 1 ? [guests[0].id] : [];
}

export function getUnassignedSummary(cart, guests) {
  const groups = [];
  let totalUnits = 0;
  for (const item of cart) {
    let count = 0;
    for (const assignment of item.unitAssignments) {
      if (effectiveAssignment(assignment, guests).length === 0) count += 1;
    }
    if (count > 0) {
      groups.push({ itemId: item.id, name: item.name, count });
      totalUnits += count;
    }
  }
  return { totalUnits, groups };
}

// Per-guest subtotal/tax/total. Guests with nothing assigned are omitted so
// the payment screen doesn't show a confusing €0.00 line.
//
// Rounding: every intermediate amount is kept at full precision; only the
// final per-guest total is rounded to the cent. Any leftover rounding
// difference between the sum of rounded totals and the real order total is
// absorbed entirely by whichever guest has the highest (exact) subtotal, so
// the sum of the displayed totals always equals the order total exactly.
export function computeGuestBreakdown(cart, guests, taxRate = TAX_RATE) {
  if (guests.length === 0) return [];

  const subtotalByGuest = new Map(guests.map((g) => [g.id, 0]));

  for (const item of cart) {
    for (const assignment of item.unitAssignments) {
      const effective = effectiveAssignment(assignment, guests);
      if (effective.length === 0) continue;
      const share = item.price / effective.length;
      for (const guestId of effective) {
        if (!subtotalByGuest.has(guestId)) continue;
        subtotalByGuest.set(guestId, subtotalByGuest.get(guestId) + share);
      }
    }
  }

  const totalSubtotal = [...subtotalByGuest.values()].reduce((a, b) => a + b, 0);
  if (totalSubtotal === 0) return [];

  const totalTax = totalSubtotal * taxRate;
  const grandTotal = totalSubtotal + totalTax;

  const rows = guests
    .map((guest) => {
      const subtotal = subtotalByGuest.get(guest.id) || 0;
      const tax = totalTax * (subtotal / totalSubtotal);
      return { guestId: guest.id, name: guest.name, subtotal, tax, total: subtotal + tax };
    })
    .filter((row) => row.subtotal > 0);

  if (rows.length === 0) return [];

  const roundedRows = rows.map((row) => ({ ...row, roundedCents: Math.round(row.total * 100) }));
  const roundedSum = roundedRows.reduce((sum, row) => sum + row.roundedCents, 0);
  const targetCents = Math.round(grandTotal * 100);
  const diffCents = targetCents - roundedSum;

  if (diffCents !== 0) {
    const largest = roundedRows.reduce(
      (max, row) => (row.subtotal > max.subtotal ? row : max),
      roundedRows[0]
    );
    largest.roundedCents += diffCents;
  }

  return roundedRows.map((row) => ({
    guestId: row.guestId,
    name: row.name,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.roundedCents / 100,
  }));
}
