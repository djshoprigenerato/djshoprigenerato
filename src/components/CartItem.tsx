import React from "react";
import { useCart } from "../context/CartContext";

export default function CartItem({
  item,
}: {
  item: {
    id: number;
    name: string;
    price: number;
    qty: number;
    image_url: string;
  };
}) {
  const { dispatch } = useCart();

  return (
    <div className="flex items-center border-b py-4">
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${item.image_url}`}
        alt={item.name}
        className="w-24 h-24 object-cover mr-4"
      />
      <div className="flex-grow">
        <h3 className="font-semibold">{item.name}</h3>
        <p>€{item.price.toFixed(2)}</p>
        <div className="flex items-center mt-2">
          <button
            onClick={() =>
              dispatch({ type: "UPDATE_QTY", payload: { id: item.id, qty: item.qty - 1 } })
            }
            disabled={item.qty <= 1}
            className="px-2"
          >
            -
          </button>
          <span className="px-3">{item.qty}</span>
          <button
            onClick={() =>
              dispatch({ type: "UPDATE_QTY", payload: { id: item.id, qty: item.qty + 1 } })
            }
            className="px-2"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item.id })}
        className="text-red-500 px-2"
      >
        Rimuovi
      </button>
    </div>
  );
}
