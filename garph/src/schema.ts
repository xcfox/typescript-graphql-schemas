import { GarphSchema, buildSchema } from 'garph'
import type { Infer, InferResolvers } from 'garph'
import { GraphQLDateTime } from 'graphql-scalars'
import { USERS, MENU_ITEMS, ORDERS } from '@coffee-shop/shared'

export const g = new GarphSchema()

export const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})

export const MenuCategoryEnum = g.enumType('MenuCategory', ['COFFEE', 'FOOD'] as const)
export const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g
    .ref(() => OrderType)
    .list()
    .omitResolver()
    .optional(),
})

export const MenuItemType = g.type('MenuItem', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
  category: g.ref(MenuCategoryEnum),
})

export const OrderType = g.type('Order', {
  id: g.int(),
  userId: g.int(),
  itemIds: g.int().list(),
  status: g.ref(OrderStatusEnum),
  createdAt: g.ref(DateTime),
  user: g.ref(UserType).omitResolver().optional(),
  items: g.ref(MenuItemType).list().omitResolver().optional(),
})

export type User = Infer<typeof UserType>
export type MenuItem = Infer<typeof MenuItemType>
export type Order = Infer<typeof OrderType>

// Data maps for in-memory storage with generic types
export const userMap = new Map<number, User>(USERS.map((u) => [u.id, u as User]))
export const menuItemMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, item as MenuItem]),
)
export const orderMap = new Map<number, Order>(ORDERS.map((o) => [o.id, o as Order]))

export { buildSchema }
export type { InferResolvers, Infer }
