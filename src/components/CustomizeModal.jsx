import { useState } from "react";
import { createDefaultCustomization } from "../customization";

export default function CustomizeModal({ dish, onConfirm, onClose }) {
  const [counts, setCounts] = useState(createDefaultCustomization(dish));

  function updateCount(name, delta) {
    setCounts((prev) => ({ ...prev, [name]: Math.max(0, (prev[name] ?? 1) + delta) }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {dish.emoji} {dish.name}
        </h2>
        <p className="customize-hint">
          Remove an ingredient (0) or ask for more of it.
        </p>
        <ul className="customize-list">
          {dish.ingredients.map((name) => (
            <li key={name} className="customize-row">
              <span className="customize-name">{name}</span>
              <div className="customize-counter">
                <button
                  type="button"
                  className="qty-btn"
                  disabled={counts[name] === 0}
                  onClick={() => updateCount(name, -1)}
                >
                  −
                </button>
                <span className="customize-count">{counts[name]}</span>
                <button type="button" className="qty-btn" onClick={() => updateCount(name, 1)}>
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn-primary" onClick={() => onConfirm(counts)}>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
