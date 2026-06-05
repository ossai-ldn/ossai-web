import { Slot } from 'expo-router';
import ShopGate from '../../components/ShopGate';

export default function ShopLayout() {
  return (
    <ShopGate>
      <Slot />
    </ShopGate>
  );
}
