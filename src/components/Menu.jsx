import { isCustomizable } from "../customization";
import { DISCOUNT_RATE } from "../idleDiscount";

const CATEGORIES = ["All", "Starters", "Mains", "Desserts"];

export default function Menu({
  dishes,
  dishPrices,
  discountDishId,
  selectedCategory,
  onCategoryChange,
  onAddToCart,
  onCustomize,
}) {
  const filteredDishes =
    selectedCategory === "All"
      ? dishes
      : dishes.filter((dish) => dish.category === selectedCategory);

  return (
    <section className="menu">
      <h2>Menu</h2>

      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="dish-grid">
        {filteredDishes.map((dish) => {
          const menuPrice = dishPrices[dish.id] ?? dish.price;
          const isDiscounted = dish.id === discountDishId;
          const displayPrice = isDiscounted ? menuPrice * (1 - DISCOUNT_RATE) : menuPrice;

          return (
          <div key={dish.id} className={`dish-card ${isDiscounted ? "dish-card-discounted" : ""}`}>
            {isDiscounted && <span className="discount-badge">-10% today only</span>}
            {isCustomizable(dish) ? (
              <button
                type="button"
                className="dish-emoji dish-emoji-customizable"
                title="Click to customize ingredients"
                onClick={() => onCustomize(dish)}
              >
                {dish.emoji}
                <span className="dish-emoji-badge">✎</span>
              </button>
            ) : (
              <span className="dish-emoji">{dish.emoji}</span>
            )}
            <div className="dish-info">
              <h3>{dish.name}</h3>
              <p>{dish.description}</p>
              <div className="dish-footer">
                {isDiscounted ? (
                  <span className="dish-price">
                    <span className="dish-price-original">€{menuPrice.toFixed(2)}</span>
                    €{displayPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="dish-price">€{displayPrice.toFixed(2)}</span>
                )}
                <button className="add-btn" onClick={() => onAddToCart(dish)}>
                  Add to cart
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
