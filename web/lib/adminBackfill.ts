import { classifyContact } from './classifyContact';
import { adminRequest, fetchMyDiscount } from './callables';

export type SignupRow = {
  id: string;
  contact: string;
  type: string;
  discountCode: string;
  discountPercent: number;
};

function pickKeeper(docs: SignupRow[]): SignupRow {
  return [...docs].sort((a, b) => {
    const aCode = String(a.discountCode ?? '').trim();
    const bCode = String(b.discountCode ?? '').trim();
    if (aCode && !bCode) return -1;
    if (!aCode && bCode) return 1;
    return 0;
  })[0];
}

/**
 * Backfill using only actions available on older deployed adminApi builds
 * (listSignups + getMyDiscount). Cannot delete dupes or migrate canonical ids
 * until functions are redeployed with backfillSignups.
 */
export async function backfillSignupsClient(adminSecret: string) {
  const { signups } = await adminRequest<{ signups: SignupRow[] }>(adminSecret, 'listSignups');

  const byContact = new Map<string, SignupRow[]>();
  for (const row of signups) {
    const parsed = classifyContact(row.contact);
    if (!parsed) continue;
    const list = byContact.get(parsed.value) ?? [];
    list.push(row);
    byContact.set(parsed.value, list);
  }

  let codesAssigned = 0;
  let dupesRemaining = 0;

  for (const [, docs] of byContact) {
    if (docs.length > 1) dupesRemaining += docs.length - 1;
    const keeper = pickKeeper(docs);
    if (!String(keeper.discountCode ?? '').trim()) {
      await fetchMyDiscount({ signupId: keeper.id, contact: keeper.contact });
      codesAssigned++;
    }
  }

  return {
    ok: true,
    merged: 0,
    migrated: 0,
    codesAssigned,
    phonesFixed: 0,
    contacts: byContact.size,
    dupesRemaining,
    partial: dupesRemaining > 0,
  };
}
