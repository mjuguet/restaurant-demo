import { useState, useEffect, useRef } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import PaymentModal from "./components/PaymentModal";
import SplitBillModal from "./components/SplitBillModal";
import CustomizeModal from "./components/CustomizeModal";
import {
  createUnitAssignments,
  resizeUnitAssignments,
  assignUnit,
  shareRemainingEqually,
  removeGuestFromAssignments,
  resetAssignments,
  makeGuestId,
} from "./splitBill";
import { isDefaultCustomization } from "./customization";
import { DISCOUNT_RATE, IDLE_MS, pickRandomDiscountDish } from "./idleDiscount";
import "./App.css";

const PRICE_BUMP_RATE = 0.05;

export default function App() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPayment, setShowPayment] = useState(false);
  const [guests, setGuests] = useState([]);
  const [splitBillEnabled, setSplitBillEnabled] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [dishPrices, setDishPrices] = useState(() =>
    Object.fromEntries(dishes.map((dish) => [dish.id, dish.price]))
  );
  const [customizingDish, setCustomizingDish] = useState(null);
  const [discountDishId, setDiscountDishId] = useState(null);

  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  const discountDishIdRef = useRef(discountDishId);
  useEffect(() => {
    discountDishIdRef.current = discountDishId;
  }, [discountDishId]);

  // After IDLE_MS with no mouse/keyboard/scroll activity, surprise the user
  // with a 10% discount on one dish they haven't ordered yet.
  useEffect(() => {
    let timer;
    function triggerIdleDiscount() {
      if (discountDishIdRef.current) return;
      const pick = pickRandomDiscountDish(dishes, cartRef.current);
      if (pick) setDiscountDishId(pick.id);
    }
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(triggerIdleDiscount, IDLE_MS);
    }
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(timer);
    };
  }, []);

  function addToCart(dish, customization = null) {
    const basePrice = dishPrices[dish.id];
    const isDiscounted = discountDishId === dish.id;
    const currentPrice = isDiscounted ? basePrice * (1 - DISCOUNT_RATE) : basePrice;
    const isCustomized = customization && !isDefaultCustomization(dish, customization);

    if (!isCustomized) {
      const existing = cart.find((item) => item.dishId === dish.id && !item.customization);
      if (existing) {
        setCart(
          cart.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  price: currentPrice,
                  quantity: item.quantity + 1,
                  unitAssignments: resizeUnitAssignments(item.unitAssignments, item.quantity + 1),
                }
              : item
          )
        );
      } else {
        setCart([
          ...cart,
          {
            ...dish,
            id: dish.id,
            dishId: dish.id,
            customization: null,
            price: currentPrice,
            quantity: 1,
            unitAssignments: createUnitAssignments(1),
          },
        ]);
      }
    } else {
      const lineId = `${dish.id}-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setCart([
        ...cart,
        {
          ...dish,
          id: lineId,
          dishId: dish.id,
          customization,
          price: currentPrice,
          quantity: 1,
          unitAssignments: createUnitAssignments(1),
        },
      ]);
    }

    setDishPrices((prev) => ({ ...prev, [dish.id]: basePrice * (1 + PRICE_BUMP_RATE) }));
    if (isDiscounted) setDiscountDishId(null);
  }

  function removeFromCart(id) {
    const removed = cart.find((item) => item.id === id);
    setCart(cart.filter((item) => item.id !== id));
    const dishId = removed?.dishId ?? id;
    const baseDish = dishes.find((dish) => dish.id === dishId);
    if (baseDish) {
      setDishPrices((prev) => ({ ...prev, [dishId]: baseDish.price }));
    }
  }

  function openCustomize(dish) {
    setCustomizingDish(dish);
  }

  function confirmCustomize(customization) {
    addToCart(customizingDish, customization);
    setCustomizingDish(null);
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

      <h2 className="page-title">Mangez varié !!</h2>

      <main className="app-main">
        <Menu
          dishes={dishes}
          dishPrices={dishPrices}
          discountDishId={discountDishId}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
          onCustomize={openCustomize}
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
      {customizingDish && (
        <CustomizeModal
          dish={customizingDish}
          onConfirm={confirmCustomize}
          onClose={() => setCustomizingDish(null)}
        />
      )}
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
