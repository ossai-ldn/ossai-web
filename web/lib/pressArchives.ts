import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { mapArchiveDoc, mapPressDoc, type ArchiveItem, type PressItem } from './siteTypes';

export async function loadPressItems(): Promise<PressItem[]> {
  const q = query(
    collection(db, 'pressItems'),
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => mapPressDoc(doc.id, doc.data() as Record<string, unknown>));
}

export async function loadArchives(): Promise<ArchiveItem[]> {
  const q = query(
    collection(db, 'archives'),
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => mapArchiveDoc(doc.id, doc.data() as Record<string, unknown>));
}
