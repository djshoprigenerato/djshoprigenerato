import Link from "next/link";
import React from "react";
import { useCart } from "../context/CartContext";

export default function Header() {
  const { state } = useCart();
  const totalQty = state.reduce((sum, i) => sum + i.qty, 0);

  return (
    <header className="bg-primary text-white py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/">
          <a className="text-2xl font-bold">DJ Shop Rigenerato</a>
        </Link>
        <nav className="space-x-4">
          <Link href="/shop">
            <a>Shop</a>
          </Link>
          <Link href="/cart">
            <a>Carrello ({totalQty})</a>
          </Link>
        </nav>
      </div>
    </header>
  );
}
