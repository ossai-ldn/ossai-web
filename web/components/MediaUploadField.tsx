import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAdminSecret } from '../lib/accessSession';
import { acceptForSlot, pickLocalFile, uploadProductMedia, type MediaSlot } from '../lib/productUpload';

type Props = {
  label: string;
  slot: MediaSlot;
  value: string;
  onChange: (url: string) => void;
  productId?: string | null;
  onError?: (message: string) => void;
};

export function MediaUploadField({ label, slot, value, onChange, productId, onError }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (Platform.OS !== 'web') {
      onError?.('Upload from gallery is available on the web admin (ossai.co.uk/admin).');
      return;
    }

    const secret = getAdminSecret();
    if (!secret) return;

    const file = await pickLocalFile(acceptForSlot(slot));
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductMedia(
        secret,
        file,
        slot,
        productId && productId !== 'new' ? productId : undefined,
      );
      onChange(url);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const isVideo = slot === 'video';
  const showPreview = Boolean(value) && !isVideo;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {showPreview ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : null}
      {isVideo && value ? (
        <Text style={styles.videoHint} numberOfLines={1}>
          Video: {value.split('/').pop()?.split('?')[0] ?? 'uploaded'}
        </Text>
      ) : null}
      <TextInput
        style={styles.input}
        placeholder={isVideo ? 'Video URL (or upload below)' : 'Image URL (or upload below)'}
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.btn, uploading && styles.btnDisabled]}
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnText}>
            {isVideo ? 'UPLOAD VIDEO FROM DEVICE' : 'UPLOAD IMAGE FROM DEVICE'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
  },
  preview: {
    width: '100%',
    height: 120,
    backgroundColor: '#1c1c1e',
    marginBottom: 8,
  },
  videoHint: {
    color: '#8e8e93',
    fontSize: 11,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  btn: {
    borderWidth: 1,
    borderColor: '#555',
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 10, letterSpacing: 2 },
});
