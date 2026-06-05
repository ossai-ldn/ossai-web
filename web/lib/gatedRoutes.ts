/** Routes that require site password before any content is shown. */
export const GATED_PATH_PREFIXES = ['/shop', '/search'] as const;

export function isGatedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return GATED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
