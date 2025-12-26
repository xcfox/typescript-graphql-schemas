import { Gql } from 'gqtx'
import { GraphQLDateTime } from 'graphql-scalars'
import { USERS, MENU_ITEMS, ORDERS } from '@coffee-shop/shared'

export const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})

export const SugarLevelEnum = Gql.Enum({
  name: 'SugarLevel',
  description: 'Sugar level for coffee',
  values: [
    { name: 'NONE', value: 'NONE' },
    { name: 'LOW', value: 'LOW' },
    { name: 'MEDIUM', value: 'MEDIUM' },
    { name: 'HIGH', value: 'HIGH' },
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

export type Coffee = {
  __typename: 'Coffee'
  id: number
  name: string
  price: number
  sugarLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  origin: string
}

export type Dessert = {
  __typename: 'Dessert'
  id: number
  name: string
  price: number
  calories: number
}

export type MenuItem = Coffee | Dessert

export type Order = {
  id: number
  userId: number
  itemIds: number[]
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
}

export const userMap = new Map<number, User>(USERS.map((u) => [u.id, { ...u }]))
export const menuItemMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, item as MenuItem]),
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

// Interface: Food (公共字段)
export const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  description: 'Food interface with common fields',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})

// Coffee 类型，实现 Food 接口
export const CoffeeType: any = Gql.Object<Coffee>({
  name: 'Coffee',
  description: 'Coffee menu item',
  interfaces: [FoodInterface],
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})

// Dessert 类型，实现 Food 接口
export const DessertType: any = Gql.Object<Dessert>({
  name: 'Dessert',
  description: 'Dessert menu item',
  interfaces: [FoodInterface],
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'calories', type: Gql.NonNull(Gql.Float) }),
  ],
})

// Union 类型: MenuItem = Coffee | Dessert
export const MenuItemType = Gql.Union({
  name: 'MenuItem',
  description: 'Menu item union type',
  types: [CoffeeType, DessertType],
  resolveType: (value: MenuItem) => {
    return value.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
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
