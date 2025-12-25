import { objectType, extendType, intArg, nonNull, enumType, list } from 'nexus'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import * as z from 'zod'
import { userMap, User } from './user.ts'
import { menuMap, MenuItem } from './menu.ts'
import { parse } from '../utils/validate.ts'

export const OrderStatus = enumType({
  name: 'OrderStatus',
  members: ['PENDING', 'COMPLETED'],
})

export const Order = objectType({
  name: 'Order',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', {
      type: 'DateTime',
    })
    t.nonNull.field('status', {
      type: OrderStatus,
    })
    t.nonNull.int('userId')
    t.nonNull.list.nonNull.int('itemIds')
    t.field('user', {
      type: User,
      resolve(parent) {
        return userMap.get(parent.userId) || null
      },
    })
    t.nonNull.list.nonNull.field('items', {
      type: MenuItem,
      resolve(parent) {
        return parent.itemIds
          .map((id) => menuMap.get(id))
          .filter((item): item is NonNullable<typeof item> => !!item)
      },
    })
  },
})

// In-memory data store
export const orderMap = new Map<
  number,
  {
    id: number
    userId: number
    itemIds: number[]
    status: 'PENDING' | 'COMPLETED'
    createdAt: Date
  }
>(
  ORDERS.map((o) => [
    o.id,
    {
      ...o,
      status: o.status as 'PENDING' | 'COMPLETED',
      createdAt: o.createdAt,
    },
  ]),
)

export const OrderQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('orders', {
      type: Order,
      resolve() {
        return Array.from(orderMap.values())
      },
    })

    t.nonNull.field('order', {
      type: Order,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const order = orderMap.get(id)
        if (!order) {
          throw new GraphQLError('Order not found')
        }
        return order
      },
    })
  },
})

export const OrderMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createOrder', {
      type: Order,
      args: {
        userId: nonNull(intArg()),
        items: nonNull(list(nonNull(intArg()))),
      },
      resolve(_parent, { userId, items }) {
        // Validate userId exists
        if (!userMap.has(userId)) {
          throw new GraphQLError('User not found')
        }

        // Validate items exist and array is not empty
        const itemsSchema = z
          .array(z.number().refine((id) => menuMap.has(id), 'Menu item not found'))
          .min(1, 'At least one item is required')

        parse(itemsSchema, items)

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
    })

    t.nonNull.field('updateOrder', {
      type: Order,
      args: {
        id: nonNull(intArg()),
        status: nonNull('OrderStatus'),
      },
      resolve(_parent, { id, status }) {
        const order = orderMap.get(id)
        if (!order) {
          throw new GraphQLError('Order not found')
        }
        order.status = status as 'PENDING' | 'COMPLETED'
        return order
      },
    })

    t.field('deleteOrder', {
      type: Order,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const order = orderMap.get(id)
        if (order) {
          orderMap.delete(id)
        }
        return order || null
      },
    })
  },
})
