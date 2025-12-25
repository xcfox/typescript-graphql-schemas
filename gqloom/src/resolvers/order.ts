import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { resolver, query, mutation, field } from '@gqloom/core'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { User, userMap } from './user.ts'
import { MenuItem, menuMap } from './menu.ts'

export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])

export const Order = z.object({
  __typename: z.literal('Order').nullish(),
  id: z.int(),
  createdAt: z.date(),
  status: OrderStatus,
  userId: z.int(),
  itemIds: z.array(z.int()),
})

export const orderMap = new Map<number, z.infer<typeof Order>>(ORDERS.map((o) => [o.id, o]))

export const orderResolver = resolver.of(Order, {
  user: field(z.lazy(() => User).nullish()).resolve((order) => userMap.get(order.userId)),

  items: field(z.array(MenuItem)).resolve((order) => {
    return order.itemIds.map((itemId) => menuMap.get(itemId)).filter((i) => i != null)
  }),

  orders: query(z.array(Order)).resolve(() => Array.from(orderMap.values())),

  order: query(Order)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      return order
    }),

  createOrder: mutation(Order)
    .input({
      userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
      items: z
        .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
        .min(1, 'At least one item is required'),
    })
    .resolve(({ userId, items }) => {
      const id = incrementId()
      const newOrder = {
        id,
        userId,
        itemIds: items,
        status: 'PENDING' as const,
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder)
      return newOrder
    }),

  updateOrder: mutation(Order)
    .input({
      id: z.int(),
      status: OrderStatus,
    })
    .resolve(({ id, status }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      order.status = status
      return order
    }),

  deleteOrder: mutation(z.nullish(Order))
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const order = orderMap.get(id)
      if (order) orderMap.delete(id)
      return order
    }),
})
