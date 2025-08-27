import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NextPage } from "next";
import ProductCard from "../../components/ProductCard";
import CategoryCard from "../../components/CategoryCard";

const Shop: NextPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: prods } = await supabase.from("products").select("*");
      setProducts(prods || []);
      const { data: cats } = await supabase.from("categories").select("*");
      setCategories(cats || []);
    }
    fetchData();
  }, []);

  const filtered = selectedCat
    ? products.filter((p) => p.category_id === selectedCat)
    : products;

  return (
    <div>
      <h1 className="text-3xl mb-6">Shop</h1>
      <div className="mb-6 flex flex-wrap">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-4 py-2 mr-2 mb-2 rounded ${
            selectedCat === null ? "bg-dark text-white" : "bg-gray-200"
          }`}
        >
          Tutti
        </button>
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} onSelect={setSelectedCat} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((prod) => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>
    </div>
  );
};

export default Shop;
