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
import { SITE_HEADER_HEIGHT } from '../components/SiteHeader';
import { MediaUploadField } from '../components/MediaUploadField';
import {
  clearAdminSecret,
  getAdminSecret,
  setAdminSecret,
} from '../lib/accessSession';
import { backfillSignupsClient } from '../lib/adminBackfill';
import { adminRequest } from '../lib/callables';
import { callableCode, callableMessage, isUnknownAdminAction } from '../lib/callableError';

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
  videoUrl?: string;
  shopifyUrl?: string;
  description?: string;
  details?: string;
  sortOrder?: number;
  stockQty?: number;
  active?: boolean;
  soldOut?: boolean;
};

const emptyDraft = {
  title: '',
  slug: '',
  priceDisplay: '',
  imageFront: '',
  imageBack: '',
  videoUrl: '',
  shopifyUrl: '',
  description: '',
  details: '',
  stockQty: '0',
};

export default function AdminScreen() {
  const router = useRouter();
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
      const { config } = await adminRequest<{ config: { sitePassword: string; shopLive: boolean } }>(
        adminSecret,
        'getConfig',
      );
      setSitePassword(config.sitePassword);
      setShopLive(config.shopLive);

      const signupRes = await adminRequest<{ signups: SignupRow[] }>(adminSecret, 'listSignups');
      setSignups(signupRes.signups);

      const productRes = await adminRequest<{ products: ProductRow[] }>(adminSecret, 'listProducts');
      setProducts(productRes.products);
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

  const formatBackfillMessage = (result: Record<string, unknown>) => {
    const base = `Backfill: ${result.merged ?? 0} dupes removed, ${result.migrated ?? 0} migrated to canonical ids, ${result.codesAssigned ?? 0} codes assigned.`;
    if (result.partial && Number(result.dupesRemaining ?? 0) > 0) {
      return `${base} ${result.dupesRemaining} duplicate rows remain — deploy functions and run again for full dedupe.`;
    }
    return base;
  };

  const runBackfillSignups = async () => {
    const s = getAdminSecret();
    if (!s) return;
    setLoading(true);
    setMessage('');
    try {
      let result: Record<string, unknown>;
      try {
        result = await adminRequest<Record<string, unknown>>(s, 'backfillSignups');
      } catch (e) {
        if (callableCode(e) === 'functions/permission-denied') {
          throw e;
        }
        result = await backfillSignupsClient(s);
      }
      setMessage(formatBackfillMessage(result));
      await refreshAll(s);
    } catch (e) {
      setMessage(callableMessage(e));
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
      await adminRequest(s, action, payload);
      setMessage(`Done: ${action}`);
      await refreshAll(s);
    } catch (e) {
      if (isUnknownAdminAction(e, action)) {
        setMessage(
          'Admin backend is out of date. Deploy latest functions: firebase deploy --only firestore:rules,firestore:indexes,functions',
        );
      } else {
        setMessage(callableMessage(e));
      }
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
      videoUrl: p.videoUrl ?? '',
      shopifyUrl: p.shopifyUrl ?? '',
      description: p.description ?? '',
      details: p.details ?? '',
      stockQty: String(p.stockQty ?? 0),
    });
  };

  const startNew = () => {
    setEditingId('new');
    setDraft(emptyDraft);
  };

  const saveProduct = () => {
    const payload = {
      productId: editingId === 'new' ? undefined : editingId,
      title: draft.title,
      slug: draft.slug || undefined,
      priceDisplay: draft.priceDisplay,
      imageFront: draft.imageFront,
      imageBack: draft.imageBack,
      videoUrl: draft.videoUrl,
      shopifyUrl: draft.shopifyUrl,
      description: draft.description,
      details: draft.details,
      stockQty: Number(draft.stockQty) || 0,
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
        <View style={[styles.centered, { paddingTop: SITE_HEADER_HEIGHT }]}>
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
        contentContainerStyle={{ paddingTop: SITE_HEADER_HEIGHT + 16, padding: 16, paddingBottom: 48 }}
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

        <Text style={styles.section}>SIGNUPS</Text>
        <TouchableOpacity style={styles.btn} onPress={runBackfillSignups}>
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
            <MediaUploadField
              label="FRONT IMAGE"
              slot="front"
              value={draft.imageFront}
              onChange={(url) => setDraft({ ...draft, imageFront: url })}
              productId={editingId}
              onError={setMessage}
            />
            <MediaUploadField
              label="BACK IMAGE (HOVER)"
              slot="back"
              value={draft.imageBack}
              onChange={(url) => setDraft({ ...draft, imageBack: url })}
              productId={editingId}
              onError={setMessage}
            />
            <MediaUploadField
              label="PRODUCT VIDEO (OPTIONAL)"
              slot="video"
              value={draft.videoUrl}
              onChange={(url) => setDraft({ ...draft, videoUrl: url })}
              productId={editingId}
              onError={setMessage}
            />
            <TextInput style={styles.input} placeholder="Shopify product URL" placeholderTextColor="#666" value={draft.shopifyUrl} onChangeText={(t) => setDraft({ ...draft, shopifyUrl: t })} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Stock quantity (admin only)" placeholderTextColor="#666" value={draft.stockQty} onChangeText={(t) => setDraft({ ...draft, stockQty: t })} keyboardType="number-pad" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#666" value={draft.description} onChangeText={(t) => setDraft({ ...draft, description: t })} multiline />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Details (size, material…)" placeholderTextColor="#666" value={draft.details} onChangeText={(t) => setDraft({ ...draft, details: t })} multiline />
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
