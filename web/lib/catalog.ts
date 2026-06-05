import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { mapCollectionDoc, mapPageDoc, type Collection, type ContentPage } from './siteTypes';
import { mapProductDoc, type Product } from './productTypes';

export async function loadActiveProducts(): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => mapProductDoc(doc.id, doc.data() as Record<string, unknown>));
}

export async function loadProductBySlug(slug: string): Promise<Product | null> {
  const q = query(
    collection(db, 'products'),
    where('slug', '==', slug),
    where('active', '==', true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapProductDoc(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function loadActiveCollections(): Promise<Collection[]> {
  const q = query(
    collection(db, 'collections'),
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => mapCollectionDoc(doc.id, doc.data() as Record<string, unknown>));
}

export async function loadCollectionByHandle(handle: string): Promise<Collection | null> {
  const q = query(
    collection(db, 'collections'),
    where('handle', '==', handle),
    where('active', '==', true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapCollectionDoc(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function loadPageBySlug(slug: string): Promise<ContentPage | null> {
  const q = query(
    collection(db, 'pages'),
    where('slug', '==', slug),
    where('active', '==', true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapPageDoc(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export type SortOption = 'newest' | 'price-asc' | 'price-desc';

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products];
  if (sort === 'price-asc' || sort === 'price-desc') {
    copy.sort((a, b) => {
      const pa = parsePrice(a.priceDisplay);
      const pb = parsePrice(b.priceDisplay);
      return sort === 'price-asc' ? pa - pb : pb - pa;
    });
  }
  return copy;
}

export function filterProducts(
  products: Product[],
  filters: { size?: string; color?: string; availability?: 'in-stock' | 'coming-soon' },
): Product[] {
  return products.filter((p) => {
    if (filters.availability === 'coming-soon' && !p.comingSoon) return false;
    if (filters.availability === 'in-stock' && (p.soldOut || p.comingSoon)) return false;
    if (filters.size && p.variants.length > 0) {
      if (!p.variants.some((v) => v.size === filters.size && v.stockQty > 0)) return false;
    }
    if (filters.color && p.variants.length > 0) {
      if (!p.variants.some((v) => v.color === filters.color)) return false;
    }
    return true;
  });
}

function parsePrice(display: string): number {
  const match = display.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function searchProducts(products: Product[], q: string): Product[] {
  const term = q.trim().toLowerCase();
  if (!term) return products;
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(term) ||
      p.slug.toLowerCase().includes(term) ||
      p.tags.some((t) => t.toLowerCase().includes(term)),
  );
}
