import { Gql } from 'gqtx'
import { GraphQLDateTime } from 'graphql-scalars'
import { USERS, MENU_ITEMS, ORDERS } from '@coffee-shop/shared'

export const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})

export const MenuCategoryEnum = Gql.Enum({
  name: 'MenuCategory',
  description: 'Menu category',
  values: [
    { name: 'COFFEE', value: 'COFFEE' },
    { name: 'FOOD', value: 'FOOD' },
  ],
})

export const OrderStatusEnum = Gql.Enum({
  name: 'OrderStatus',
  description: 'Order status',
  values: [
    { name: 'PENDING', value: 'PENDING' },
    { name: 'COMPLETED', value: 'COMPLETED' },
    { name: 'CANCELLED', value: 'CANCELLED' },
  ],
})

export type User = {
  id: number
  name: string
  email: string
}

export type MenuItem = {
  id: number
  name: string
  price: number
  category: 'COFFEE' | 'FOOD'
}

export type Order = {
  id: number
  userId: number
  itemIds: number[]
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
}

export const userMap = new Map<number, User>(USERS.map((u) => [u.id, { ...u }]))
export const menuItemMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, { ...item }]),
)
export const orderMap = new Map<number, Order>(
  ORDERS.map((o) => [o.id, { ...o, status: o.status as any }]),
)

export const UserType: any = Gql.Object<User>({
  name: 'User',
  description: 'User information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
    Gql.Field({
      name: 'orders',
      type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
      resolve: (user) => {
        return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
      },
    }),
  ],
})

export const MenuItemType = Gql.Object<MenuItem>({
  name: 'MenuItem',
  description: 'Menu item information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'category', type: Gql.NonNull(MenuCategoryEnum) }),
  ],
})

export const OrderType: any = Gql.Object<Order>({
  name: 'Order',
  description: 'Order information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'userId', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'itemIds', type: Gql.NonNull(Gql.List(Gql.NonNull(Gql.Int))) }),
    Gql.Field({ name: 'status', type: Gql.NonNull(OrderStatusEnum) }),
    Gql.Field({ name: 'createdAt', type: Gql.NonNull(DateTime) }),
    Gql.Field({
      name: 'user',
      type: Gql.NonNull(UserType),
      resolve: (order) => {
        const user = userMap.get(order.userId)
        if (!user) throw new Error('User not found')
        return user
      },
    }),
    Gql.Field({
      name: 'items',
      type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
      resolve: (order) => {
        return order.itemIds.map((id) => {
          const item = menuItemMap.get(id)
          if (!item) throw new Error(`Menu item ${id} not found`)
          return item
        })
      },
    }),
  ],
})
