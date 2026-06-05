import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHeaderOffset } from '../components/SiteHeader';
import {
  clearAdminSecret,
  getAdminSecret,
  setAdminSecret,
} from '../lib/accessSession';
import { adminRequest } from '../lib/callables';

type SignupRow = {
  id: string;
  contact: string;
  type: string;
  discountCode: string;
  discountPercent: number;
};

type ProductRow = {
  id: string;
  title?: string;
  slug?: string;
  priceDisplay?: string;
  imageFront?: string;
  imageBack?: string;
  imageUrl?: string;
  shopifyUrl?: string;
  description?: string;
  details?: string;
  sortOrder?: number;
  stockQty?: number;
  active?: boolean;
  soldOut?: boolean;
  comingSoon?: boolean;
  collabLabel?: string;
  collectionHandles?: string[];
  variants?: unknown[];
  features?: string[];
};

type CollectionRow = {
  id: string;
  handle?: string;
  title?: string;
  description?: string;
  seasonLabel?: string;
  active?: boolean;
};

type RestockAlert = {
  id: string;
  productId?: string;
  variantId?: string;
  email?: string;
};

const emptyDraft = {
  title: '',
  slug: '',
  priceDisplay: '',
  imageFront: '',
  imageBack: '',
  shopifyUrl: '',
  description: '',
  details: '',
  stockQty: '0',
  collabLabel: '',
  collectionHandles: '',
  variantsJson: '[]',
  features: '',
  comingSoon: false,
};

export default function AdminScreen() {
  const router = useRouter();
  const headerOffset = useHeaderOffset();
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sitePassword, setSitePassword] = useState('');
  const [shopLive, setShopLive] = useState(false);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [featuredCollection, setFeaturedCollection] = useState('');
  const [newsletterPromo, setNewsletterPromo] = useState('');
  const [shippingPromo, setShippingPromo] = useState('');
  const [announcementJson, setAnnouncementJson] = useState('[]');
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [collectionDraft, setCollectionDraft] = useState({ handle: '', title: '', description: '', seasonLabel: '' });
  const [restockAlerts, setRestockAlerts] = useState<RestockAlert[]>([]);

  useEffect(() => {
    const stored = getAdminSecret();
    if (stored) {
      setSecret(stored);
      setAuthed(true);
      refreshAll(stored);
    }
  }, []);

  const refreshAll = async (adminSecret: string) => {
    setLoading(true);
    setMessage('');
    try {
      const { config } = await adminRequest<{
        config: {
          sitePassword: string;
          shopLive: boolean;
          featuredCollectionHandle?: string;
          newsletterPromoText?: string;
          shippingPromoText?: string;
          announcementBar?: { enabled: boolean; messages: { text: string; link?: string }[] };
        };
      }>(adminSecret, 'getConfig');
      setSitePassword(config.sitePassword);
      setShopLive(config.shopLive);
      setFeaturedCollection(config.featuredCollectionHandle ?? '');
      setNewsletterPromo(config.newsletterPromoText ?? '');
      setShippingPromo(config.shippingPromoText ?? '');
      setAnnouncementJson(JSON.stringify(config.announcementBar?.messages ?? [], null, 2));

      const signupRes = await adminRequest<{ signups: SignupRow[] }>(adminSecret, 'listSignups');
      setSignups(signupRes.signups);

      const productRes = await adminRequest<{ products: ProductRow[] }>(adminSecret, 'listProducts');
      setProducts(productRes.products);

      const colRes = await adminRequest<{ collections: CollectionRow[] }>(adminSecret, 'listCollections');
      setCollections(colRes.collections);

      const alertRes = await adminRequest<{ alerts: RestockAlert[] }>(adminSecret, 'listRestockAlerts');
      setRestockAlerts(alertRes.alerts);
    } catch {
      setMessage('Session expired or invalid secret.');
      clearAdminSecret();
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    try {
      await adminRequest(secret.trim(), 'getConfig');
      setAdminSecret(secret.trim());
      setAuthed(true);
      await refreshAll(secret.trim());
    } catch {
      setMessage('Invalid admin secret.');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    const s = getAdminSecret();
    if (!s) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await adminRequest<Record<string, unknown>>(s, action, payload);
      if (action === 'backfillSignups' && result) {
        setMessage(
          `Backfill: ${result.merged ?? 0} duplicates removed, ${result.codesAssigned ?? 0} codes assigned.`,
        );
      } else {
        setMessage(`Done: ${action}`);
      }
      await refreshAll(s);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (p: ProductRow) => {
    setEditingId(p.id);
    setDraft({
      title: p.title ?? '',
      slug: p.slug ?? '',
      priceDisplay: p.priceDisplay ?? '',
      imageFront: String(p.imageFront ?? p.imageUrl ?? ''),
      imageBack: p.imageBack ?? '',
      shopifyUrl: p.shopifyUrl ?? '',
      description: p.description ?? '',
      details: p.details ?? '',
      stockQty: String(p.stockQty ?? 0),
      collabLabel: p.collabLabel ?? '',
      collectionHandles: (p.collectionHandles ?? []).join(', '),
      variantsJson: JSON.stringify(p.variants ?? [], null, 2),
      features: (p.features ?? []).join('\n'),
      comingSoon: p.comingSoon === true,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setDraft(emptyDraft);
  };

  const saveProduct = () => {
    let variants: unknown[] = [];
    try {
      variants = JSON.parse(draft.variantsJson);
    } catch {
      setMessage('Invalid variants JSON');
      return;
    }
    const payload = {
      productId: editingId === 'new' ? undefined : editingId,
      title: draft.title,
      slug: draft.slug || undefined,
      priceDisplay: draft.priceDisplay,
      imageFront: draft.imageFront,
      imageBack: draft.imageBack,
      shopifyUrl: draft.shopifyUrl,
      description: draft.description,
      details: draft.details,
      stockQty: Number(draft.stockQty) || 0,
      collabLabel: draft.collabLabel || undefined,
      comingSoon: draft.comingSoon,
      collectionHandles: draft.collectionHandles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      features: draft.features.split('\n').map((s) => s.trim()).filter(Boolean),
      variants,
      sortOrder: editingId === 'new' ? products.length : undefined,
    };
    runAction('upsertProduct', payload).then(() => {
      setEditingId(null);
      setDraft(emptyDraft);
    });
  };

  if (!authed) {
    return (
      <View style={styles.container}>
        <View style={[styles.centered, { paddingTop: headerOffset }]}>
          <Text style={styles.title}>ADMIN</Text>
          <TextInput
            style={styles.input}
            placeholder="Admin secret"
            placeholderTextColor="#666"
            secureTextEntry
            value={secret}
            onChangeText={setSecret}
          />
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>SIGN IN</Text>
            )}
          </TouchableOpacity>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 24 }}>
            <Text style={styles.link}>Back to site</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: headerOffset + 16, padding: 16, paddingBottom: 48 }}
      >
        <Text style={styles.title}>ADMIN</Text>
        {message ? <Text style={styles.msg}>{message}</Text> : null}
        {loading && <ActivityIndicator color="#fff" style={{ marginBottom: 12 }} />}

        <Text style={styles.section}>SITE ACCESS</Text>
        <Text style={styles.label}>Site password (drop gate)</Text>
        <TextInput
          style={styles.input}
          value={sitePassword}
          onChangeText={setSitePassword}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => runAction('setSitePassword', { sitePassword })}
        >
          <Text style={styles.btnText}>SAVE PASSWORD</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnHalf, shopLive && styles.btnActive]}
            onPress={() => runAction('setShopLive')}
          >
            <Text style={styles.btnText}>GO LIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnHalf]}
            onPress={() => runAction('setShopOffline')}
          >
            <Text style={styles.btnText}>GO OFFLINE</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Shop is {shopLive ? 'LIVE' : 'OFFLINE'}</Text>

        <Text style={styles.section}>SITE PROMOS</Text>
        <TextInput style={styles.input} placeholder="Featured collection handle" placeholderTextColor="#666" value={featuredCollection} onChangeText={setFeaturedCollection} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Newsletter promo text" placeholderTextColor="#666" value={newsletterPromo} onChangeText={setNewsletterPromo} />
        <TextInput style={styles.input} placeholder="Shipping promo text" placeholderTextColor="#666" value={shippingPromo} onChangeText={setShippingPromo} />
        <Text style={styles.label}>Announcement messages (JSON array)</Text>
        <TextInput style={[styles.input, styles.textArea]} value={announcementJson} onChangeText={setAnnouncementJson} multiline autoCapitalize="none" />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            try {
              const messages = JSON.parse(announcementJson);
              runAction('setSitePromos', {
                featuredCollectionHandle: featuredCollection,
                newsletterPromoText: newsletterPromo,
                shippingPromoText: shippingPromo,
                announcementBar: { enabled: true, messages },
              });
            } catch {
              setMessage('Invalid announcement JSON');
            }
          }}
        >
          <Text style={styles.btnText}>SAVE PROMOS</Text>
        </TouchableOpacity>

        <Text style={styles.section}>COLLECTIONS ({collections.length})</Text>
        <TextInput style={styles.input} placeholder="Handle" placeholderTextColor="#666" value={collectionDraft.handle} onChangeText={(t) => setCollectionDraft({ ...collectionDraft, handle: t })} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#666" value={collectionDraft.title} onChangeText={(t) => setCollectionDraft({ ...collectionDraft, title: t })} />
        <TextInput style={styles.input} placeholder="Season label" placeholderTextColor="#666" value={collectionDraft.seasonLabel} onChangeText={(t) => setCollectionDraft({ ...collectionDraft, seasonLabel: t })} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" value={collectionDraft.description} onChangeText={(t) => setCollectionDraft({ ...collectionDraft, description: t })} multiline />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            runAction('upsertCollection', collectionDraft).then(() =>
              setCollectionDraft({ handle: '', title: '', description: '', seasonLabel: '' }),
            );
          }}
        >
          <Text style={styles.btnText}>ADD COLLECTION</Text>
        </TouchableOpacity>
        {collections.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardSub}>/{c.handle} · {c.seasonLabel}</Text>
          </View>
        ))}

        <Text style={styles.section}>SIGNUPS</Text>
        <TouchableOpacity style={styles.btn} onPress={() => runAction('backfillSignups')}>
          <Text style={styles.btnText}>DEDUPE & BACKFILL DISCOUNTS</Text>
        </TouchableOpacity>

        <Text style={styles.section}>PRODUCTS ({products.length})</Text>
        <TouchableOpacity style={styles.btn} onPress={startNew}>
          <Text style={styles.btnText}>+ NEW PRODUCT</Text>
        </TouchableOpacity>

        {editingId ? (
          <View style={styles.editor}>
            <Text style={styles.label}>{editingId === 'new' ? 'New product' : 'Edit product'}</Text>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#666" value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} />
            <TextInput style={styles.input} placeholder="URL slug (optional)" placeholderTextColor="#666" value={draft.slug} onChangeText={(t) => setDraft({ ...draft, slug: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Price display" placeholderTextColor="#666" value={draft.priceDisplay} onChangeText={(t) => setDraft({ ...draft, priceDisplay: t })} />
            <TextInput style={styles.input} placeholder="Front image URL" placeholderTextColor="#666" value={draft.imageFront} onChangeText={(t) => setDraft({ ...draft, imageFront: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Back image URL (hover)" placeholderTextColor="#666" value={draft.imageBack} onChangeText={(t) => setDraft({ ...draft, imageBack: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Shopify product URL" placeholderTextColor="#666" value={draft.shopifyUrl} onChangeText={(t) => setDraft({ ...draft, shopifyUrl: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Stock quantity (admin only)" placeholderTextColor="#666" value={draft.stockQty} onChangeText={(t) => setDraft({ ...draft, stockQty: t })} keyboardType="number-pad" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" value={draft.description} onChangeText={(t) => setDraft({ ...draft, description: t })} multiline />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Details (size, material…)" placeholderTextColor="#666" value={draft.details} onChangeText={(t) => setDraft({ ...draft, details: t })} multiline />
            <TextInput style={styles.input} placeholder="Collab label" placeholderTextColor="#666" value={draft.collabLabel} onChangeText={(t) => setDraft({ ...draft, collabLabel: t })} />
            <TextInput style={styles.input} placeholder="Collection handles (comma-separated)" placeholderTextColor="#666" value={draft.collectionHandles} onChangeText={(t) => setDraft({ ...draft, collectionHandles: t })} autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Features (one per line)" placeholderTextColor="#666" value={draft.features} onChangeText={(t) => setDraft({ ...draft, features: t })} multiline />
            <Text style={styles.label}>Variants JSON (size, color, stockQty, measurements)</Text>
            <TextInput style={[styles.input, styles.textArea]} value={draft.variantsJson} onChangeText={(t) => setDraft({ ...draft, variantsJson: t })} multiline autoCapitalize="none" />
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => setDraft({ ...draft, comingSoon: !draft.comingSoon })}
            >
              <Text style={styles.smallBtnText}>{draft.comingSoon ? 'COMING SOON: ON' : 'COMING SOON: OFF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={saveProduct}>
              <Text style={styles.btnText}>SAVE PRODUCT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingId(null); setDraft(emptyDraft); }}>
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {products.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardSub}>
              /shop/{p.slug ?? p.id} · stock {p.stockQty ?? 0}
              {p.soldOut ? ' · SOLD OUT' : ''}
              {p.active === false ? ' · HIDDEN' : ' · ON DISPLAY'}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => startEdit(p)}>
                <Text style={styles.smallBtnText}>EDIT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() =>
                  runAction('upsertProduct', {
                    productId: p.id,
                    title: p.title,
                    shopifyUrl: p.shopifyUrl,
                    active: p.active === false,
                  })
                }
              >
                <Text style={styles.smallBtnText}>{p.active === false ? 'SHOW' : 'HIDE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() =>
                  runAction('upsertProduct', {
                    productId: p.id,
                    title: p.title,
                    shopifyUrl: p.shopifyUrl,
                    soldOut: !p.soldOut,
                    stockQty: p.stockQty,
                  })
                }
              >
                <Text style={styles.smallBtnText}>{p.soldOut ? 'MARK IN STOCK' : 'MARK SOLD OUT'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => runAction('deleteProduct', { productId: p.id })}>
              <Text style={styles.danger}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.section}>RESTOCK ALERTS ({restockAlerts.length})</Text>
        {restockAlerts.slice(0, 20).map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.email}</Text>
            <Text style={styles.cardSub}>{a.productId} · {a.variantId}</Text>
            <TouchableOpacity onPress={() => runAction('markRestockNotified', { alertId: a.id })}>
              <Text style={styles.link}>Mark notified</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.section}>SIGNUPS ({signups.length})</Text>
        {signups.slice(0, 30).map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.contact}</Text>
            <Text style={styles.cardSub}>
              {s.discountCode || '—'} · {s.discountPercent ?? 10}%
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.btn, { marginTop: 24 }]}
          onPress={() => {
            clearAdminSecret();
            setAuthed(false);
          }}
        >
          <Text style={styles.btnText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 18, letterSpacing: 6, marginBottom: 24, textAlign: 'center' },
  section: {
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 4,
    marginTop: 28,
    marginBottom: 12,
  },
  label: { color: '#8e8e93', fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  editor: {
    borderWidth: 1,
    borderColor: '#3a3a3c',
    padding: 12,
    marginBottom: 16,
  },
  btn: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 6,
    marginTop: 8,
  },
  smallBtnText: { color: '#fff', fontSize: 9, letterSpacing: 1 },
  btnHalf: { flex: 1 },
  btnActive: { backgroundColor: '#2c2c2e' },
  btnText: { color: '#fff', fontSize: 11, letterSpacing: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { color: '#8e8e93', fontSize: 12, marginBottom: 8 },
  msg: { color: '#aaffbf', marginBottom: 12, fontSize: 13 },
  error: { color: '#ff918b', marginTop: 12 },
  link: { color: '#8e8e93', textAlign: 'center', marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { color: '#fff', fontSize: 13 },
  cardSub: { color: '#8e8e93', fontSize: 12, marginTop: 4 },
  danger: { color: '#ff918b', marginTop: 8, fontSize: 12 },
});
