export const incrementId = (() => {
  let id = 0
  return () => ++id
})()

export interface User {
  id: number
  name: string
  email: string
}

export interface MenuItem {
  id: number
  name: string
  price: number
  category: 'COFFEE' | 'FOOD'
}

export interface Order {
  id: number
  userId: number
  itemIds: number[]
  status: 'PENDING' | 'COMPLETED'
  createdAt: Date
}

export const USERS: User[] = [
  { id: incrementId(), name: 'Alice', email: 'alice@example.com' },
  { id: incrementId(), name: 'Bob', email: 'bob@example.com' },
]

export const MENU_ITEMS: MenuItem[] = [
  { id: incrementId(), name: 'Latte', price: 4.5, category: 'COFFEE' },
  { id: incrementId(), name: 'Americano', price: 3.5, category: 'COFFEE' },
  { id: incrementId(), name: 'Croissant', price: 3.0, category: 'FOOD' },
]

export const ORDERS: Order[] = [
  {
    id: incrementId(),
    userId: USERS[0].id,
    itemIds: [MENU_ITEMS[0].id, MENU_ITEMS[2].id],
    status: 'COMPLETED',
    createdAt: new Date('2025-12-25T10:00:00Z'),
  },
]
