export type Product = {
  id: string;
  slug: string;
  title: string;
  priceDisplay: string;
  imageFront: string;
  imageBack: string;
  imageUrl: string;
  shopifyUrl: string;
  description: string;
  details: string;
  soldOut: boolean;
  stockQty?: number;
  active?: boolean;
};

export function mapProductDoc(id: string, d: Record<string, unknown>): Product {
  const imageFront = String(d.imageFront ?? d.imageUrl ?? '');
  const imageBack = String(d.imageBack ?? '');
  return {
    id,
    slug: String(d.slug ?? id),
    title: String(d.title ?? ''),
    priceDisplay: String(d.priceDisplay ?? ''),
    imageFront,
    imageBack,
    imageUrl: imageFront,
    shopifyUrl: String(d.shopifyUrl ?? ''),
    description: String(d.description ?? ''),
    details: String(d.details ?? ''),
    soldOut: d.soldOut === true,
    stockQty: typeof d.stockQty === 'number' ? d.stockQty : undefined,
    active: d.active !== false,
  };
}
