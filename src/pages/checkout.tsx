import { useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";

const CheckoutPage = () => {
  const { state, dispatch } = useCart();
  const total = state.reduce((sum, i) => sum + i.price * i.qty, 0);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    // 1) Creazione ordine
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: null,
        items: state.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
        total,
      }),
    });
    const { orderId } = await orderRes.json();

    // 2) Sessione Stripe
    const stripeRes = await fetch("/api/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: state.map((i) => ({
          id: i.id,
          qty: i.qty,
          price: i.price,
          name: i.name,
        })),
        couponCode: coupon,
        orderId,
      }),
    });
    const { url } = await stripeRes.json();
    router.push(url);
  };

  return (
    <div>
      <h1 className="text-3xl mb-6">Checkout</h1>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <label className="block mb-2">Codice sconto</label>
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <p className="text-lg mb-6">Totale: €{total.toFixed(2)}</p>
        <button
          onClick={handleCheckout}
          disabled={loading || state.length === 0}
          className="bg-primary text-white px-6 py-2 rounded"
        >
          {loading ? "Redirezione..." : "Paga con Stripe"}
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
