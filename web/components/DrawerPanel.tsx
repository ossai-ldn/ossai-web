import { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, layout } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: 'right' | 'left' | 'full';
};

export default function DrawerPanel({
  visible,
  onClose,
  title,
  children,
  side = 'right',
}: Props) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.panel,
            side === 'left' && styles.panelLeft,
            side === 'full' && styles.panelFull,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    width: '100%',
    maxWidth: layout.drawerWidth,
    backgroundColor: colors.bg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    height: '100%',
    zIndex: 2,
  },
  panelLeft: {
    alignSelf: 'flex-start',
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  panelFull: {
    maxWidth: '100%',
    borderLeftWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '600',
  },
  close: {
    color: colors.textMuted,
    fontSize: 18,
    padding: 4,
  },
  body: {
    flex: 1,
    padding: 20,
  },
});
