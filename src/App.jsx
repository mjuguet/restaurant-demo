import { useState } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import PaymentModal from "./components/PaymentModal";
import SplitBillModal from "./components/SplitBillModal";
import {
  createUnitAssignments,
  resizeUnitAssignments,
  assignUnit,
  shareRemainingEqually,
  removeGuestFromAssignments,
  resetAssignments,
  makeGuestId,
} from "./splitBill";
import "./App.css";

export default function App() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPayment, setShowPayment] = useState(false);
  const [guests, setGuests] = useState([]);
  const [splitBillEnabled, setSplitBillEnabled] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);

  function addToCart(dish) {
    const existing = cart.find((item) => item.id === dish.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === dish.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                unitAssignments: resizeUnitAssignments(item.unitAssignments, item.quantity + 1),
              }
            : item
        )
      );
    } else {
      setCart([...cart, { ...dish, quantity: 1, unitAssignments: createUnitAssignments(1) }]);
    }
  }

  function removeFromCart(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  function updateQuantity(id, quantity) {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, quantity, unitAssignments: resizeUnitAssignments(item.unitAssignments, quantity) }
          : item
      )
    );
  }

  function openSplitBill() {
    setSplitBillEnabled(true);
    setShowSplitBillModal(true);
  }

  function cancelSplitBill() {
    setSplitBillEnabled(false);
    setShowSplitBillModal(false);
    setGuests([]);
    setCart((prev) => resetAssignments(prev));
  }

  function addGuest(name) {
    const trimmed = name.trim();
    setGuests((prev) => [
      ...prev,
      { id: makeGuestId(), name: trimmed || `Guest ${prev.length + 1}` },
    ]);
  }

  function removeGuest(id) {
    setGuests((prev) => prev.filter((guest) => guest.id !== id));
    setCart((prev) => removeGuestFromAssignments(prev, id));
  }

  function handleAssignUnit(itemId, unitIndex, guestIds) {
    setCart((prev) => assignUnit(prev, itemId, unitIndex, guestIds));
  }

  function handleShareRemaining() {
    setCart((prev) => shareRemainingEqually(prev, guests));
  }

  function goToPaymentFromSplitBill() {
    setShowSplitBillModal(false);
    setShowPayment(true);
  }

  function editAssignmentsFromPayment() {
    setShowPayment(false);
    setShowSplitBillModal(true);
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app">
      <header className="app-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <img src={`${import.meta.env.BASE_URL}deliveroo-logo.png`} alt="Deliveroo" height="36" />
          <h1>roo<span style={{color:"#1a271f"}}>food</span></h1>
          <span className="delivery-eta">
            <span className="eta-dot" />
            <span className="eta-icon">🛵</span>
            Delivery in {deliveryInfo.etaMin}–{deliveryInfo.etaMax} min
          </span>
        </div>
        <div className="cart-badge-wrapper">
          <span className="cart-icon">🛒</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
      </header>

      <main className="app-main">
        <Menu
          dishes={dishes}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />
        <Cart
          cart={cart}
          onRemove={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onCheckout={() => setShowPayment(true)}
          guests={guests}
          splitBillEnabled={splitBillEnabled}
          onOpenSplitBill={openSplitBill}
          onCancelSplitBill={cancelSplitBill}
        />
      </main>
      {showSplitBillModal && (
        <SplitBillModal
          cart={cart}
          guests={guests}
          onAddGuest={addGuest}
          onRemoveGuest={removeGuest}
          onAssignUnit={handleAssignUnit}
          onShareRemaining={handleShareRemaining}
          onClose={() => setShowSplitBillModal(false)}
          onGoToPayment={goToPaymentFromSplitBill}
        />
      )}
      {showPayment && (
        <PaymentModal
          cart={cart}
          guests={guests}
          splitBillEnabled={splitBillEnabled}
          onEditAssignments={editAssignmentsFromPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setCart([]);
            setGuests([]);
            setSplitBillEnabled(false);
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}
