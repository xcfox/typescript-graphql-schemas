import { builder } from '../builder.ts'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { z } from 'zod'
import { GraphQLError } from 'graphql'
import { userMap, UserRef } from './user.ts'
import { menuMap, MenuItemRef } from './menu.ts'

export const OrderStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

builder.enumType(OrderStatus, {
  name: 'OrderStatus',
})

export interface OrderShape {
  id: number
  createdAt: Date
  status: OrderStatus
  userId: number
  itemIds: number[]
}

export const orderMap = new Map<number, OrderShape>(
  ORDERS.map((o) => [o.id, { ...o, status: o.status as OrderStatus }]),
)

export const OrderRef = builder.objectRef<OrderShape>('Order')

OrderRef.implement({
  fields: (t) => ({
    id: t.exposeInt('id'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    status: t.expose('status', { type: OrderStatus }),
    userId: t.exposeInt('userId'),
    itemIds: t.exposeIntList('itemIds'),
    user: t.field({
      type: UserRef,
      nullable: true,
      resolve: (order) => userMap.get(order.userId) || null,
    }),
    items: t.field({
      type: [MenuItemRef],
      resolve: (order) => {
        return order.itemIds
          .map((id) => menuMap.get(id))
          .filter((item): item is NonNullable<typeof item> => !!item)
      },
    }),
  }),
})

builder.queryFields((t) => ({
  orders: t.field({
    type: [OrderRef],
    resolve: () => Array.from(orderMap.values()),
  }),
  order: t.field({
    type: OrderRef,
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
    type: OrderRef,
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
      const newOrder: OrderShape = {
        id,
        userId,
        itemIds: items,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder)
      return newOrder
    },
  }),
  updateOrder: t.field({
    type: OrderRef,
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
    type: OrderRef,
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
