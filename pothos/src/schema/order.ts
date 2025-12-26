import { builder } from '../builder.ts'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { userMap, User } from './user.ts'
import { menuMap, MenuItem } from './menu.ts'

// OrderStatus 枚举
export const OrderStatus = builder.enumType('OrderStatus', {
  values: ['PENDING', 'COMPLETED'] as const,
})

export const Order = builder.simpleObject('Order', {
  fields: (t) => ({
    id: t.int(),
    createdAt: t.field({ type: 'DateTime' }),
    status: t.field({ type: OrderStatus }),
    userId: t.int(),
    itemIds: t.intList(),
  }),
})

builder.objectFields(Order, (t) => ({
  user: t.field({
    type: User,
    nullable: true,
    resolve: (order) => userMap.get(order.userId) || null,
  }),
  items: t.field({
    type: [MenuItem],
    resolve: (order) => {
      return order.itemIds
        .map((id) => menuMap.get(id))
        .filter((item): item is NonNullable<typeof item> => !!item)
    },
  }),
}))

// 使用 Pothos 推荐的 $inferType 来推导类型
export const orderMap = new Map<number, typeof Order.$inferType>(
  ORDERS.map((o) => [
    o.id,
    { ...o, status: o.status as 'PENDING' | 'COMPLETED' } as typeof Order.$inferType,
  ]),
)

builder.queryFields((t) => ({
  orders: t.field({
    type: [Order],
    resolve: () => Array.from(orderMap.values()),
  }),
  order: t.field({
    type: Order,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      return order
    },
  }),
}))

builder.mutationFields((t) => ({
  createOrder: t.field({
    type: Order,
    args: {
      userId: t.arg.int({
        required: true,
        validate: z.number().refine((id) => userMap.has(id), 'User not found'),
      }),
      items: t.arg.intList({
        required: true,
        validate: z
          .array(z.number().refine((id) => menuMap.has(id), 'Menu item not found'))
          .min(1, 'At least one item is required'),
      }),
    },
    resolve: (_parent, { userId, items }) => {
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
    },
  }),
  updateOrder: t.field({
    type: Order,
    args: {
      id: t.arg.int({ required: true }),
      status: t.arg({ type: OrderStatus, required: true }),
    },
    resolve: (_parent, { id, status }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      order.status = status
      return order
    },
  }),
  deleteOrder: t.field({
    type: Order,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const order = orderMap.get(id)
      if (order) orderMap.delete(id)
      return order || null
    },
  }),
}))
