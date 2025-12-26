import { Gql } from 'gqtx'
import { GraphQLError } from 'graphql'
import { incrementId } from '@coffee-shop/shared'
import { OrderType, orderMap, OrderStatusEnum, userMap, menuItemMap } from './types.ts'
import type { Order } from './types.ts'

export const orderQueryFields = [
  Gql.Field({
    name: 'orders',
    type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
    resolve: () => Array.from(orderMap.values()),
  }),
  Gql.Field({
    name: 'order',
    type: OrderType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    },
    resolve: (_, { id }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      return order
    },
  }),
]

export const orderMutationFields = [
  Gql.Field({
    name: 'createOrder',
    type: Gql.NonNull(OrderType),
    args: {
      userId: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      items: Gql.Arg({ type: Gql.NonNullInput(Gql.ListInput(Gql.NonNullInput(Gql.Int))) }),
    },
    resolve: (_, { userId, items }) => {
      if (items.length === 0) throw new GraphQLError('At least one item is required')
      if (!userMap.has(userId)) throw new GraphQLError('User not found')
      for (const itemId of items) {
        if (!menuItemMap.has(itemId)) throw new GraphQLError(`Menu item not found`)
      }
      const id = incrementId()
      const newOrder: Order = {
        id,
        userId,
        itemIds: items,
        status: 'PENDING',
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder)
      return newOrder
    },
  }),
  Gql.Field({
    name: 'updateOrder',
    type: OrderType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      status: Gql.Arg({ type: Gql.NonNullInput(OrderStatusEnum) }),
    },
    resolve: (_, { id, status }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      order.status = status as Order['status']
      return order
    },
  }),
  Gql.Field({
    name: 'deleteOrder',
    type: OrderType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    },
    resolve: (_, { id }) => {
      const order = orderMap.get(id)
      if (order) orderMap.delete(id)
      return order ?? null
    },
  }),
]
