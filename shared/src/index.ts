export interface User {
  id: string
  name: string
  email: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: 'COFFEE' | 'FOOD'
}

export interface Order {
  id: string
  userId: string
  itemIds: string[]
  status: 'PENDING' | 'COMPLETED'
  createdAt: Date
}

export const USERS: User[] = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com' },
]

export const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Latte', price: 4.5, category: 'COFFEE' },
  { id: 'm2', name: 'Americano', price: 3.5, category: 'COFFEE' },
  { id: 'm3', name: 'Croissant', price: 3.0, category: 'FOOD' },
]

export const ORDERS: Order[] = [
  {
    id: 'o1',
    userId: '1',
    itemIds: ['m1', 'm3'],
    status: 'COMPLETED',
    createdAt: new Date('2025-12-25T10:00:00Z'),
  },
]

