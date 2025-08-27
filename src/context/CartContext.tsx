import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  image_url: string;
}

type Action =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QTY"; payload: { id: number; qty: number } }
  | { type: "CLEAR_CART" };

const CartContext = createContext<{
  state: CartItem[];
  dispatch: React.Dispatch<Action>;
} | null>(null);

function cartReducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM":
      const exists = state.find((i) => i.id === action.payload.id);
      if (exists) {
        return state.map((i) =>
          i.id === action.payload.id
            ? { ...i, qty: i.qty + action.payload.qty }
            : i
        );
      }
      return [...state, action.payload];

    case "REMOVE_ITEM":
      return state.filter((i) => i.id !== action.payload);

    case "UPDATE_QTY":
      return state.map((i) =>
        i.id === action.payload.id ? { ...i, qty: action.payload.qty } : i
      );

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, [], () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dj-cart");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("dj-cart", JSON.stringify(state));
  }, [state]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro CartProvider");
  return ctx;
}
