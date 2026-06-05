export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'piece';
}

function parseVariants(raw: unknown, existing?: Record<string, unknown>[]) {
  if (!Array.isArray(raw)) return existing ?? [];
  return raw.map((v, i) => {
    const item = v as Record<string, unknown>;
    const measurements = item.measurements as Record<string, unknown> | undefined;
    return {
      id: String(item.id ?? `v${i}`),
      size: typeof item.size === 'string' ? item.size.trim() : '',
      color: typeof item.color === 'string' ? item.color.trim() : '',
      sku: typeof item.sku === 'string' ? item.sku.trim() : '',
      stockQty: Math.max(0, Math.round(Number(item.stockQty ?? 0))),
      shopifyVariantId:
        typeof item.shopifyVariantId === 'string' ? item.shopifyVariantId.trim() : undefined,
      measurements: measurements
        ? {
            chest: measurements.chest ? String(measurements.chest) : undefined,
            sleeve: measurements.sleeve ? String(measurements.sleeve) : undefined,
            length: measurements.length ? String(measurements.length) : undefined,
          }
        : undefined,
    };
  });
}

export function productPayloadFromRequest(
  data: Record<string, unknown>,
  existing?: Record<string, unknown>,
) {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const shopifyUrl = typeof data.shopifyUrl === 'string' ? data.shopifyUrl.trim() : '';
  if (!title || !shopifyUrl) {
    return null;
  }

  const imageFront =
    typeof data.imageFront === 'string'
      ? data.imageFront.trim()
      : typeof data.imageUrl === 'string'
        ? data.imageUrl.trim()
        : String(existing?.imageFront ?? existing?.imageUrl ?? '');

  const imageBack =
    typeof data.imageBack === 'string' ? data.imageBack.trim() : String(existing?.imageBack ?? '');

  const galleryUrls = Array.isArray(data.galleryUrls)
    ? data.galleryUrls.map((u) => String(u).trim()).filter(Boolean)
    : Array.isArray(existing?.galleryUrls)
      ? (existing.galleryUrls as string[])
      : [];

  const slug =
    typeof data.slug === 'string' && data.slug.trim()
      ? data.slug.trim().toLowerCase()
      : String(existing?.slug ?? slugify(title));

  const variants = parseVariants(data.variants, existing?.variants as Record<string, unknown>[]);
  const hasVariants = variants.length > 0;
  const variantStock = variants.reduce((sum, v) => sum + Number(v.stockQty ?? 0), 0);
  const stockQty = hasVariants
    ? variantStock
    : Math.max(0, Math.round(Number(data.stockQty ?? existing?.stockQty ?? 0)));

  let soldOut = existing?.soldOut === true;
  if (data.soldOut === true) soldOut = true;
  else if (data.soldOut === false) soldOut = false;
  else if (stockQty === 0) soldOut = true;
  else if (typeof data.stockQty === 'number' || hasVariants) soldOut = false;

  const active = data.active !== false;
  const comingSoon = data.comingSoon === true;

  return {
    title,
    shopifyUrl,
    slug,
    priceDisplay:
      typeof data.priceDisplay === 'string' ? data.priceDisplay.trim() : String(existing?.priceDisplay ?? ''),
    compareAtPrice:
      typeof data.compareAtPrice === 'string'
        ? data.compareAtPrice.trim()
        : existing?.compareAtPrice,
    priceFrom: data.priceFrom === true,
    imageFront,
    imageBack,
    imageUrl: imageFront,
    galleryUrls,
    description:
      typeof data.description === 'string' ? data.description.trim() : String(existing?.description ?? ''),
    details: typeof data.details === 'string' ? data.details.trim() : String(existing?.details ?? ''),
    features: Array.isArray(data.features)
      ? data.features.map((f) => String(f).trim()).filter(Boolean)
      : Array.isArray(existing?.features)
        ? existing.features
        : [],
    modelInfo:
      typeof data.modelInfo === 'string' ? data.modelInfo.trim() : String(existing?.modelInfo ?? ''),
    sortOrder: Number(data.sortOrder ?? existing?.sortOrder ?? 0),
    stockQty,
    variants,
    collectionHandles: Array.isArray(data.collectionHandles)
      ? data.collectionHandles.map((h) => String(h).trim()).filter(Boolean)
      : Array.isArray(existing?.collectionHandles)
        ? existing.collectionHandles
        : [],
    tags: Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : Array.isArray(existing?.tags)
        ? existing.tags
        : [],
    collabLabel:
      typeof data.collabLabel === 'string'
        ? data.collabLabel.trim()
        : existing?.collabLabel,
    sizeGuideSlug:
      typeof data.sizeGuideSlug === 'string'
        ? data.sizeGuideSlug.trim()
        : existing?.sizeGuideSlug,
    shopifyVariantId:
      typeof data.shopifyVariantId === 'string'
        ? data.shopifyVariantId.trim()
        : existing?.shopifyVariantId,
    active,
    soldOut,
    comingSoon,
    updatedAt: new Date(),
  };
}
