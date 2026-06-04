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
  priceDisplay?: string;
  imageUrl?: string;
  shopifyUrl?: string;
  sortOrder?: number;
  active?: boolean;
  soldOut?: boolean;
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

  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newShopify, setNewShopify] = useState('');

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

      const signupRes = await adminRequest<{ signups: SignupRow[] }>(
        adminSecret,
        'listSignups',
      );
      setSignups(signupRes.signups);

      const productRes = await adminRequest<{ products: ProductRow[] }>(
        adminSecret,
        'listProducts',
      );
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
      setMessage(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(false);
    }
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

        <Text style={styles.section}>ADD PRODUCT</Text>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#666" value={newTitle} onChangeText={setNewTitle} />
        <TextInput style={styles.input} placeholder="Price (e.g. £120)" placeholderTextColor="#666" value={newPrice} onChangeText={setNewPrice} />
        <TextInput style={styles.input} placeholder="Image URL" placeholderTextColor="#666" value={newImage} onChangeText={setNewImage} />
        <TextInput style={styles.input} placeholder="Shopify product URL" placeholderTextColor="#666" value={newShopify} onChangeText={setNewShopify} />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            runAction('upsertProduct', {
              title: newTitle,
              priceDisplay: newPrice,
              imageUrl: newImage,
              shopifyUrl: newShopify,
              sortOrder: products.length,
            }).then(() => {
              setNewTitle('');
              setNewPrice('');
              setNewImage('');
              setNewShopify('');
            });
          }}
        >
          <Text style={styles.btnText}>ADD PRODUCT</Text>
        </TouchableOpacity>

        <Text style={styles.section}>PRODUCTS ({products.length})</Text>
        {products.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardSub}>{p.priceDisplay}</Text>
            <TouchableOpacity onPress={() => runAction('deleteProduct', { productId: p.id })}>
              <Text style={styles.danger}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.section}>SIGNUPS ({signups.length})</Text>
        {signups.slice(0, 20).map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.contact}</Text>
            <Text style={styles.cardSub}>
              {s.discountCode} · {s.discountPercent}%
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
  btn: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnHalf: { flex: 1 },
  btnActive: { backgroundColor: '#2c2c2e' },
  btnText: { color: '#fff', fontSize: 11, letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 10 },
  hint: { color: '#8e8e93', fontSize: 12, marginBottom: 8 },
  msg: { color: '#aaffbf', marginBottom: 12, fontSize: 13 },
  error: { color: '#ff918b', marginTop: 12 },
  link: { color: '#8e8e93', textAlign: 'center' },
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
