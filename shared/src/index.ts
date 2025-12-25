export const incrementId = (() => {
  let id = 0
  return () => ++id
})()

export const USERS = [
  { id: incrementId(), name: 'Alice', email: 'alice@example.com' },
  { id: incrementId(), name: 'Bob', email: 'bob@example.com' },
] as const

export const MENU_ITEMS = [
  { id: incrementId(), name: 'Latte', price: 4.5, category: 'COFFEE' },
  { id: incrementId(), name: 'Americano', price: 3.5, category: 'COFFEE' },
  { id: incrementId(), name: 'Croissant', price: 3.0, category: 'FOOD' },
] as const

export const ORDERS = [
  {
    id: incrementId(),
    userId: USERS[0].id,
    itemIds: [MENU_ITEMS[0].id, MENU_ITEMS[2].id] as number[],
    status: 'COMPLETED',
    createdAt: new Date('2025-12-25T10:00:00Z'),
  },
] as const
