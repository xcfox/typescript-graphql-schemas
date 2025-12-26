import { g, DateTime } from '../g.ts'
import { GraphQLError } from 'graphql'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import type { Infer } from 'garph'
import { User, userMap } from './user.ts'
import { MenuItem, menuMap } from './menu.ts'

export const OrderStatus = g.enumType('OrderStatus', ['PENDING', 'COMPLETED'] as const)

export const Order = g.type('Order', {
  id: g.int(),
  createdAt: g.ref(() => DateTime),
  status: g.ref(() => OrderStatus),
  userId: g.int(),
  itemIds: g.int().list(),
  user: g.ref(() => User).optional(),
  items: g.ref(() => MenuItem).list(),
})

export type OrderType = Infer<typeof Order>

export const orderMap = new Map<number, OrderType>(
  ORDERS.map((o) => [o.id, { ...o, user: undefined, items: [] } as any]),
)

export const orderQuery = {
  orders: g
    .ref(() => Order)
    .list()
    .description('Get all orders'),
  order: g
    .ref(() => Order)
    .args({
      id: g.int(),
    })
    .description('Get an order by ID'),
}

export const orderMutation = {
  createOrder: g
    .ref(() => Order)
    .args({
      userId: g.int(),
      items: g.int().list(),
    })
    .description('Create a new order'),
  updateOrder: g
    .ref(() => Order)
    .args({
      id: g.int(),
      status: g.ref(() => OrderStatus),
    })
    .description('Update an order status'),
  deleteOrder: g
    .ref(() => Order)
    .optional()
    .args({
      id: g.int(),
    })
    .description('Delete an order'),
}

export const orderResolvers = {
  Order: {
    user: (order: OrderType) => userMap.get(order.userId),
    items: (order: any) =>
      order.itemIds.map((itemId: number) => menuMap.get(itemId)).filter((i: any) => i != null),
  },
  Query: {
    orders: () => Array.from(orderMap.values()),
    order: (_: any, { id }: { id: number }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      return order
    },
  },
  Mutation: {
    createOrder: (_: any, { userId, items }: any) => {
      if (!userMap.has(userId)) throw new GraphQLError('User not found')
      if (items.length === 0) throw new GraphQLError('At least one item is required')
      for (const itemId of items) {
        if (!menuMap.has(itemId)) throw new GraphQLError('Menu item not found')
      }

      const id = incrementId()
      const newOrder = {
        id,
        userId,
        itemIds: items,
        status: 'PENDING',
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder as any)
      return newOrder
    },
    updateOrder: (_: any, { id, status }: any) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      order.status = status
      return order
    },
    deleteOrder: (_: any, { id }: { id: number }) => {
      const order = orderMap.get(id)
      if (order) orderMap.delete(id)
      return order
    },
  },
}
