import { useState } from "react";
import { getUnassignedSummary } from "../splitBill";

export default function SplitBillModal({
  cart,
  guests,
  onAddGuest,
  onRemoveGuest,
  onAssignUnit,
  onShareRemaining,
  onClose,
  onGoToPayment,
}) {
  const [guestName, setGuestName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const guestUnitCounts = new Map(guests.map((guest) => [guest.id, 0]));
  cart.forEach((item) => {
    item.unitAssignments.forEach((assignment) => {
      assignment.forEach((guestId) => {
        if (guestUnitCounts.has(guestId)) {
          guestUnitCounts.set(guestId, guestUnitCounts.get(guestId) + 1);
        }
      });
    });
  });

  const unassigned = getUnassignedSummary(cart, guests);

  function handleAddGuest(e) {
    e.preventDefault();
    onAddGuest(guestName);
    setGuestName("");
  }

  function handleRemoveClick(guestId) {
    if ((guestUnitCounts.get(guestId) || 0) > 0) {
      setConfirmingDeleteId(guestId);
    } else {
      onRemoveGuest(guestId);
    }
  }

  function confirmRemove(guestId) {
    onRemoveGuest(guestId);
    setConfirmingDeleteId(null);
  }

  function toggleUnitGuest(itemId, unitIndex, currentAssignment, guestId) {
    const next = currentAssignment.includes(guestId)
      ? currentAssignment.filter((id) => id !== guestId)
      : [...currentAssignment, guestId];
    onAssignUnit(itemId, unitIndex, next);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal split-bill-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Split the bill</h2>

        <section className="split-guests">
          <h3 className="split-section-title">Guests</h3>
          {guests.length > 0 && (
            <ul className="split-guest-list">
              {guests.map((guest) => (
                <li key={guest.id} className="split-guest-row">
                  {confirmingDeleteId === guest.id ? (
                    <div className="split-guest-confirm">
                      <span>
                        Remove {guest.name}? Their {guestUnitCounts.get(guest.id)} assigned
                        item(s) will become unassigned.
                      </span>
                      <button className="split-btn-danger" onClick={() => confirmRemove(guest.id)}>
                        Confirm
                      </button>
                      <button
                        className="split-btn-ghost"
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="split-guest-name">{guest.name}</span>
                      <span className="split-guest-count">
                        {guestUnitCounts.get(guest.id) || 0} item(s)
                      </span>
                      <button
                        className="split-btn-ghost"
                        onClick={() => handleRemoveClick(guest.id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form className="split-guest-form" onSubmit={handleAddGuest}>
            <input
              className="split-guest-input"
              type="text"
              placeholder={`Guest ${guests.length + 1}`}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <button type="submit" className="split-btn-primary">
              Add guest
            </button>
          </form>
        </section>

        <section className="split-assign">
          <div className="split-assign-header">
            <h3 className="split-section-title">Assign items</h3>
            {unassigned.totalUnits > 0 && guests.length > 0 && (
              <button className="split-btn-secondary" onClick={onShareRemaining}>
                Share remaining items equally
              </button>
            )}
          </div>

          {unassigned.totalUnits > 0 && guests.length > 0 && (
            <p className="split-warning">
              {unassigned.totalUnits} item(s) not assigned yet:{" "}
              {unassigned.groups.map((g) => `${g.name} (${g.count})`).join(", ")}
            </p>
          )}

          {guests.length === 0 ? (
            <p className="split-empty">Add at least one guest to start assigning items.</p>
          ) : cart.length === 0 ? (
            <p className="split-empty">The cart is empty — add dishes to the order first.</p>
          ) : (
            <ul className="split-item-list">
              {cart.map((item) => (
                <li key={item.id} className="split-item-group">
                  <div className="split-item-group-name">
                    {item.emoji} {item.name}
                  </div>
                  {item.unitAssignments.map((assignment, unitIndex) => (
                    <div key={unitIndex} className="split-unit-row">
                      {item.quantity > 1 && (
                        <span className="split-unit-label">Unit {unitIndex + 1}</span>
                      )}
                      <div className="split-guest-chips">
                        {guests.map((guest) => (
                          <button
                            key={guest.id}
                            type="button"
                            className={`split-guest-chip ${
                              assignment.includes(guest.id) ? "active" : ""
                            }`}
                            onClick={() =>
                              toggleUnitGuest(item.id, unitIndex, assignment, guest.id)
                            }
                          >
                            {guest.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="modal-btn-primary" onClick={onGoToPayment}>
            Go to payment
          </button>
        </div>
      </div>
    </div>
  );
}
