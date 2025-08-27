import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NextPage } from "next";
import { useCart } from "../../context/CartContext";

const ProductPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<any>(null);
  const { dispatch } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (id) {
      supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => setProduct(data));
    }
  }, [id]);

  if (!product) return <p>Loading...</p>;

  const addToCart = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        qty,
        image_url: product.image_url,
      },
    });
  };

  return (
    <div className="flex flex-col md:flex-row">
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${product.image_url}`}
        alt={product.name}
        className="w-full md:w-1/2 h-auto object-cover mb-4"
      />
      <div className="md:ml-6">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-xl text-secondary mt-2">€{product.price.toFixed(2)}</p>
        <p className="mt-4">{product.description}</p>
        <div className="mt-4 flex items-center">
          <input
            type="number"
            value={qty}
            min={1}
            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
            className="w-16 border rounded p-1 mr-4"
          />
          <button onClick={addToCart} className="bg-primary text-white px-4 py-2 rounded">
            Aggiungi al carrello
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
