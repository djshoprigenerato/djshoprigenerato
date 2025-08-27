import type { NextPage } from "next";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";

const CartPage: NextPage = () => {
  const { state } = useCart();
  const total = state.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div>
      <h1 className="text-3xl mb-6">Carrello</h1>
      {state.length === 0 && (
        <p>
          Il carrello è vuoto.{" "}
          <Link href="/shop">
            <a className="text-secondary">Vai allo Shop</a>
          </Link>
        </p>
      )}
      {state.map((item) => (
        <CartItem key={item.id} item={item} />
      ))}
      {state.length > 0 && (
        <div className="mt-6 text-right">
          <p className="text-xl">Totale: €{total.toFixed(2)}</p>
          <Link href="/checkout">
            <a className="mt-4 inline-block bg-secondary text-white px-6 py-2 rounded">
              Procedi al checkout
            </a>
          </Link>
        </div>
      )}
    </div>
  );
};

export default CartPage;
