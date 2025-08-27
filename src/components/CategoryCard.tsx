import React from "react";

interface Category {
  id: number;
  name: string;
}

export default function CategoryCard({
  category,
  onSelect,
}: {
  category: Category;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className="px-3 py-1 border rounded mr-2 mb-2 bg-secondary text-white hover:opacity-90"
    >
      {category.name}
    </button>
  );
}
