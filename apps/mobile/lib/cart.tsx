import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  productId: string;
  titleMn: string;
  priceMnt: number;
  image?: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((raw) => {
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    });
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    AsyncStorage.setItem(CART_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      const next = existing
        ? prev.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...prev, { ...item, quantity: 1 }];
      AsyncStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback(
    (productId: string) => {
      persist(items.filter((i) => i.productId !== productId));
    },
    [items, persist]
  );

  const updateQuantity = useCallback(
    (productId: string, qty: number) => {
      if (qty <= 0) {
        persist(items.filter((i) => i.productId !== productId));
      } else {
        persist(
          items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
        );
      }
    },
    [items, persist]
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const total = items.reduce((sum, i) => sum + i.priceMnt * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, total, itemCount, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
