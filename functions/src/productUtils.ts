export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'piece';
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

  const videoUrl =
    typeof data.videoUrl === 'string' ? data.videoUrl.trim() : String(existing?.videoUrl ?? '');

  const slug =
    typeof data.slug === 'string' && data.slug.trim()
      ? data.slug.trim().toLowerCase()
      : String(existing?.slug ?? slugify(title));

  const stockQty = Math.max(0, Math.round(Number(data.stockQty ?? existing?.stockQty ?? 0)));

  let soldOut = existing?.soldOut === true;
  if (data.soldOut === true) soldOut = true;
  else if (data.soldOut === false) soldOut = false;
  else if (stockQty === 0) soldOut = true;
  else if (typeof data.stockQty === 'number') soldOut = false;

  const active = data.active !== false;

  return {
    title,
    shopifyUrl,
    slug,
    priceDisplay:
      typeof data.priceDisplay === 'string' ? data.priceDisplay.trim() : String(existing?.priceDisplay ?? ''),
    imageFront,
    imageBack,
    imageUrl: imageFront,
    videoUrl,
    description:
      typeof data.description === 'string' ? data.description.trim() : String(existing?.description ?? ''),
    details: typeof data.details === 'string' ? data.details.trim() : String(existing?.details ?? ''),
    sortOrder: Number(data.sortOrder ?? existing?.sortOrder ?? 0),
    stockQty,
    active,
    soldOut,
    updatedAt: new Date(),
  };
}
