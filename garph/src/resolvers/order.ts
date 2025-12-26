import { g, OrderType, orderMap, userMap, menuItemMap, OrderStatusEnum } from '../schema.ts'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import type { InferResolvers } from 'garph'

export const orderResolvers: InferResolvers<{ Order: typeof OrderType }, {}> = {
  Order: {
    user: (parent) => {
      const user = userMap.get(parent.userId)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
    items: (parent) => {
      return parent.itemIds.map((id: number) => {
        const item = menuItemMap.get(id)
        if (!item) throw new GraphQLError(`Menu item ${id} not found`)
        return item
      })
    },
  },
}

export const orderQueryFields = {
  orders: g.ref(OrderType).list(),
  order: g.ref(OrderType).optional().args({
    id: g.int(),
  }),
}

const OrderQuery = g.type('OrderQuery', orderQueryFields)

export const orderQueryResolvers: InferResolvers<{ OrderQuery: typeof OrderQuery }, {}> = {
  OrderQuery: {
    orders: () => Array.from(orderMap.values()),
    order: (_, { id }) => {
      const order = orderMap.get(id)
      return order || null
    },
  },
}

export const orderMutationFields = {
  createOrder: g.ref(OrderType).args({
    userId: g.int(),
    items: g.int().list(),
  }),
  updateOrder: g
    .ref(OrderType)
    .optional()
    .args({
      id: g.int(),
      status: g.ref(OrderStatusEnum),
    }),
  deleteOrder: g.ref(OrderType).optional().args({
    id: g.int(),
  }),
}

const OrderMutation = g.type('OrderMutation', orderMutationFields)

export const orderMutationResolvers: InferResolvers<{ OrderMutation: typeof OrderMutation }, {}> = {
  OrderMutation: {
    createOrder: (_, { userId, items: itemIds }) => {
      if (itemIds.length === 0) {
        throw new GraphQLError('At least one item is required')
      }
      if (!userMap.has(userId)) {
        throw new GraphQLError('User not found')
      }
      for (const id of itemIds) {
        if (!menuItemMap.has(id)) {
          throw new GraphQLError('Menu item not found')
        }
      }

      const id = incrementId()
      const newOrder = {
        id,
        userId,
        itemIds,
        status: 'PENDING' as const,
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder)
      return newOrder
    },
    updateOrder: (_, { id, status }) => {
      const order = orderMap.get(id)
      if (!order) return null
      order.status = status
      return order
    },
    deleteOrder: (_, { id }) => {
      const order = orderMap.get(id)
      if (order) orderMap.delete(id)
      return order || null
    },
  },
}
