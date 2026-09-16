import { TAX_RATE } from "../splitBill";
import { isCustomizable, describeCustomization, isBunOnlyBurger } from "../customization";

export default function Cart({
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  guests,
  splitBillEnabled,
  onOpenSplitBill,
  onCancelSplitBill,
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <aside className="cart">
      <h2>Your Order</h2>

      {cart.length === 0 ? (
        <p className="cart-empty">No items yet.</p>
      ) : (
        <ul className="cart-list">
          {cart.map((item) => {
            const customizable = isCustomizable(item);
            const changes = customizable ? describeCustomization(item, item.customization) : [];
            const bunOnly = isBunOnlyBurger(item, item.customization);

            return (
              <li key={item.id} className="cart-item">
                <div className="cart-item-row">
                  <span className="cart-item-emoji">{item.emoji}</span>
                  <div className="cart-item-details">
                    <span className="cart-item-name">{item.name}</span>
                    <div className="cart-item-qty-controls">
                      <button
                        className="qty-btn"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="cart-item-qty">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="cart-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                  <button className="remove-btn" onClick={() => onRemove(item.id)}>✕</button>
                </div>
                {customizable && (
                  <span className="cart-item-note">
                    {changes.length > 0 ? `Customized: ${changes.join(", ")}` : "Standard (no changes)"}
                  </span>
                )}
                {bunOnly && (
                  <span className="cart-item-easter-egg">choisissez plutôt une brischetta?</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="cart-totals">
        <div className="cart-totals-row">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row">
          <span>Tax (20%)</span>
          <span>€{tax.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row total">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="split-bill-bar">
        {splitBillEnabled ? (
          <>
            <span className="split-bill-status">
              👥 Split bill · {guests.length} guest{guests.length === 1 ? "" : "s"}
            </span>
            <button className="split-link-btn" onClick={onOpenSplitBill}>
              Edit
            </button>
            <button className="split-link-btn" onClick={onCancelSplitBill}>
              Cancel
            </button>
          </>
        ) : (
          <button
            className="split-bill-btn"
            disabled={cart.length === 0}
            onClick={onOpenSplitBill}
          >
            👥 Split the bill
          </button>
        )}
      </div>

      <button
        className="checkout-btn"
        disabled={cart.length === 0}
        onClick={onCheckout}
      >
        Place Order
      </button>
    </aside>
  );
}
