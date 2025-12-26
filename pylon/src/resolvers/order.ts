import { Int } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { Order, type OrderStatus } from '../models/index.ts'
import { userMap } from './user.ts'
import { menuItemMap } from './menu.ts'

// In-memory data map
export const orderMap = new Map<
  number,
  {
    id: number
    userId: number
    itemIds: number[]
    status: OrderStatus
    createdAt: Date
  }
>(ORDERS.map((o) => [o.id, { ...o } as any]))

export const orderQueries = {
  orders: (): Order[] => {
    return Array.from(orderMap.values()).map(
      (o) => new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt),
    )
  },
  order: (id: Int): Order | undefined => {
    const o = orderMap.get(id)
    if (!o) return undefined
    return new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt)
  },
}

export const orderMutations = {
  createOrder: (userId: Int, items: Int[]): Order => {
    if (items.length === 0) throw new GraphQLError('At least one item is required')
    if (!userMap.has(userId)) throw new GraphQLError('User not found')
    for (const itemId of items) {
      if (!menuItemMap.has(itemId)) throw new GraphQLError('Menu item not found')
    }

    const id = incrementId()
    const newOrder = {
      id,
      userId,
      itemIds: items,
      status: 'PENDING' as const,
      createdAt: new Date(),
    }
    orderMap.set(id, newOrder)
    return new Order(
      newOrder.id,
      newOrder.userId,
      newOrder.itemIds,
      newOrder.status,
      newOrder.createdAt,
    )
  },
  updateOrder: (id: Int, status: OrderStatus): Order | undefined => {
    const order = orderMap.get(id)
    if (!order) return undefined
    order.status = status
    return new Order(order.id, order.userId, order.itemIds, order.status, order.createdAt)
  },
  deleteOrder: (id: Int): Order | undefined => {
    const order = orderMap.get(id)
    if (order) {
      orderMap.delete(id)
      return new Order(order.id, order.userId, order.itemIds, order.status, order.createdAt)
    }
    return undefined
  },
}

