export type VariantMeasurements = {
  chest?: string;
  sleeve?: string;
  length?: string;
};

export type ProductVariant = {
  id: string;
  size: string;
  color: string;
  sku: string;
  stockQty: number;
  shopifyVariantId?: string;
  measurements?: VariantMeasurements;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  priceDisplay: string;
  compareAtPrice?: string;
  priceFrom?: boolean;
  imageFront: string;
  imageBack: string;
  imageUrl: string;
  galleryUrls: string[];
  shopifyUrl: string;
  shopifyVariantId?: string;
  description: string;
  details: string;
  features: string[];
  soldOut: boolean;
  comingSoon: boolean;
  collabLabel?: string;
  stockQty?: number;
  active?: boolean;
  collectionHandles: string[];
  tags: string[];
  sizeGuideSlug?: string;
  variants: ProductVariant[];
  modelInfo?: string;
};

export function mapVariant(v: Record<string, unknown>, index: number): ProductVariant {
  const measurements = v.measurements as Record<string, unknown> | undefined;
  return {
    id: String(v.id ?? `v${index}`),
    size: String(v.size ?? ''),
    color: String(v.color ?? ''),
    sku: String(v.sku ?? ''),
    stockQty: Math.max(0, Number(v.stockQty ?? 0)),
    shopifyVariantId: typeof v.shopifyVariantId === 'string' ? v.shopifyVariantId : undefined,
    measurements: measurements
      ? {
          chest: measurements.chest ? String(measurements.chest) : undefined,
          sleeve: measurements.sleeve ? String(measurements.sleeve) : undefined,
          length: measurements.length ? String(measurements.length) : undefined,
        }
      : undefined,
  };
}

export function mapProductDoc(id: string, d: Record<string, unknown>): Product {
  const imageFront = String(d.imageFront ?? d.imageUrl ?? '');
  const imageBack = String(d.imageBack ?? '');
  const galleryUrls = Array.isArray(d.galleryUrls)
    ? d.galleryUrls.map((u) => String(u)).filter(Boolean)
    : [];
  const variants = Array.isArray(d.variants)
    ? (d.variants as Record<string, unknown>[]).map(mapVariant)
    : [];

  const legacyStock = typeof d.stockQty === 'number' ? d.stockQty : undefined;
  const totalVariantStock = variants.reduce((sum, v) => sum + v.stockQty, 0);
  const hasVariants = variants.length > 0;

  return {
    id,
    slug: String(d.slug ?? id),
    title: String(d.title ?? ''),
    priceDisplay: String(d.priceDisplay ?? ''),
    compareAtPrice: typeof d.compareAtPrice === 'string' ? d.compareAtPrice : undefined,
    priceFrom: d.priceFrom === true,
    imageFront,
    imageBack,
    imageUrl: imageFront,
    galleryUrls: galleryUrls.length > 0 ? galleryUrls : [imageFront, imageBack].filter(Boolean),
    shopifyUrl: String(d.shopifyUrl ?? ''),
    shopifyVariantId: typeof d.shopifyVariantId === 'string' ? d.shopifyVariantId : undefined,
    description: String(d.description ?? ''),
    details: String(d.details ?? ''),
    features: Array.isArray(d.features) ? d.features.map((f) => String(f)) : [],
    soldOut: d.soldOut === true || (hasVariants ? totalVariantStock === 0 : legacyStock === 0),
    comingSoon: d.comingSoon === true,
    collabLabel: typeof d.collabLabel === 'string' ? d.collabLabel : undefined,
    stockQty: hasVariants ? totalVariantStock : legacyStock,
    active: d.active !== false,
    collectionHandles: Array.isArray(d.collectionHandles)
      ? d.collectionHandles.map((h) => String(h))
      : [],
    tags: Array.isArray(d.tags) ? d.tags.map((t) => String(t)) : [],
    sizeGuideSlug: typeof d.sizeGuideSlug === 'string' ? d.sizeGuideSlug : undefined,
    variants,
    modelInfo: typeof d.modelInfo === 'string' ? d.modelInfo : undefined,
  };
}

export function getProductColors(product: Product): string[] {
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))];
  return colors.length > 0 ? colors : [''];
}

export function getVariantsForColor(product: Product, color: string): ProductVariant[] {
  if (!color) return product.variants;
  return product.variants.filter((v) => v.color === color);
}

export function isProductPurchasable(product: Product, shopLive: boolean): boolean {
  if (!shopLive || product.comingSoon) return false;
  if (product.soldOut) return false;
  if (product.variants.length > 0) {
    return product.variants.some((v) => v.stockQty > 0);
  }
  return true;
}
