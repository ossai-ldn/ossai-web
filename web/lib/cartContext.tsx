import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredSignupId } from './accessSession';

export type CartLine = {
  productId: string;
  variantId: string;
  title: string;
  size: string;
  color: string;
  priceDisplay: string;
  imageUrl: string;
  shopifyUrl: string;
  shopifyVariantId?: string;
  qty: number;
  maxQty: number;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  addLine: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  updateQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  clearCart: () => void;
  buildCheckoutUrl: () => string | null;
};

const CART_KEY = 'ossai_cart';
const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(lines: CartLine[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

function appendDiscount(url: string, code: string): string {
  if (!code) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}discount=${encodeURIComponent(code)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(loadCart());
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    saveCart(next);
  }, []);

  const addLine = useCallback(
    (line: Omit<CartLine, 'qty'> & { qty?: number }) => {
      const qty = Math.max(1, line.qty ?? 1);
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === line.variantId);
        let next: CartLine[];
        if (existing) {
          const newQty = Math.min(existing.maxQty, existing.qty + qty);
          next = prev.map((l) =>
            l.variantId === line.variantId ? { ...l, qty: newQty } : l,
          );
        } else {
          next = [...prev, { ...line, qty: Math.min(qty, line.maxQty) }];
        }
        saveCart(next);
        return next;
      });
    },
    [],
  );

  const updateQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) {
        const next = prev.filter((l) => l.variantId !== variantId);
        saveCart(next);
        return next;
      }
      const next = prev.map((l) =>
        l.variantId === variantId ? { ...l, qty: Math.min(qty, l.maxQty) } : l,
      );
      saveCart(next);
      return next;
    });
  }, []);

  const removeLine = useCallback((variantId: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.variantId !== variantId);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => persist([]), [persist]);

  const buildCheckoutUrl = useCallback((): string | null => {
    if (lines.length === 0) return null;

    const withVariantIds = lines.filter((l) => l.shopifyVariantId);
    if (withVariantIds.length > 0) {
      const cartPath = withVariantIds
        .map((l) => `${l.shopifyVariantId}:${l.qty}`)
        .join(',');
      const shopHost = extractShopHost(withVariantIds[0].shopifyUrl);
      if (shopHost) {
        let url = `https://${shopHost}/cart/${cartPath}`;
        const discountCode = getDiscountCodeFromStorage();
        if (discountCode) url = appendDiscount(url, discountCode);
        return url;
      }
    }

    if (lines.length === 1) {
      let url = lines[0].shopifyUrl;
      const discountCode = getDiscountCodeFromStorage();
      if (discountCode) url = appendDiscount(url, discountCode);
      return url;
    }

    return lines[0]?.shopifyUrl ?? null;
  }, [lines]);

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      addLine,
      updateQty,
      removeLine,
      clearCart,
      buildCheckoutUrl,
    }),
    [lines, itemCount, addLine, updateQty, removeLine, clearCart, buildCheckoutUrl],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function extractShopHost(shopifyUrl: string): string | null {
  try {
    const host = new URL(shopifyUrl).hostname;
    if (host.includes('myshopify.com')) return host;
    return null;
  } catch {
    return null;
  }
}

function getDiscountCodeFromStorage(): string {
  return typeof window !== 'undefined'
    ? window.localStorage.getItem('ossai_discount_code') ?? ''
    : '';
}

export function setStoredDiscountCode(code: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('ossai_discount_code', code);
  }
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function useOptionalCart() {
  return useContext(CartContext);
}

export { getStoredSignupId };
