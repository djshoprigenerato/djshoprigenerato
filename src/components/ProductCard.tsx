import React from "react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category_id: number;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border rounded overflow-hidden shadow-sm hover:shadow-md transition p-4 flex flex-col">
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${product.image_url}`}
        alt={product.name}
        className="object-cover h-48 w-full mb-4"
      />
      <h2 className="text-lg font-semibold">{product.name}</h2>
      <p className="text-secondary font-bold mt-1">€{product.price.toFixed(2)}</p>
      <Link href={`/product/${product.id}`}>
        <a className="mt-auto bg-secondary text-white px-4 py-2 rounded text-center">
          Dettagli
        </a>
      </Link>
    </div>
  );
}
