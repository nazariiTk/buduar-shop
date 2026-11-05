import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

let useCartStore;

beforeAll(async () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  };
  const mod = await import('./useCartStore');
  useCartStore = mod.useCartStore;
});

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('starts with an empty cart', () => {
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('adds a new item to the cart with quantity = 1', () => {
    const product = { id: 1, name: 'Шовкова піжама', price: 1500 };
    useCartStore.getState().addItem(product);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...product, quantity: 1 });
  });

  it('increments quantity when adding an existing item', () => {
    const product = { id: 1, name: 'Шовкова піжама', price: 1500 };
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('can add multiple distinct items', () => {
    const item1 = { id: 1, name: 'Бра', price: 800 };
    const item2 = { id: 2, name: 'Трусики', price: 400 };

    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(1);
    expect(items[1].id).toBe(2);
  });

  it('updates quantity of a specific item', () => {
    const product = { id: 1, name: 'Корсет', price: 2200 };
    useCartStore.getState().addItem(product);

    useCartStore.getState().updateQuantity(1, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes an item by productId', () => {
    const item1 = { id: 1, name: 'Бра', price: 800 };
    const item2 = { id: 2, name: 'Халат', price: 2500 };

    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);

    useCartStore.getState().removeItem(1);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(2);
  });

  it('clears all items when clearCart is called', () => {
    useCartStore.getState().addItem({ id: 1, name: 'Item 1', price: 100 });
    useCartStore.getState().addItem({ id: 2, name: 'Item 2', price: 200 });

    expect(useCartStore.getState().items).toHaveLength(2);

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('correctly calculates total item count and total cart amount', () => {
    useCartStore.getState().addItem({ id: 1, name: 'Бра', price: 1200 });
    useCartStore.getState().addItem({ id: 1, name: 'Бра', price: 1200 });
    useCartStore.getState().addItem({ id: 2, name: 'Трусики', price: 450 });
    useCartStore.getState().addItem({ id: 3, name: 'Пеньюар', price: 3000 });
    useCartStore.getState().updateQuantity(3, 3);

    const items = useCartStore.getState().items;
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    expect(totalCount).toBe(6);
    expect(totalAmount).toBe(11850);
  });
});
