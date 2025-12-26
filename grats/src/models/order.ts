import { ORDERS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import { userMap } from './user.ts'
import type { User } from './user.ts'
import { menuMap } from './menu.ts'
import type { MenuItem } from './menu.ts'
import type { Int } from 'grats'
import type { DateTime } from './scalars.ts'

/**
 * Order status
 * @gqlEnum
 */
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

/**
 * Order information
 * @gqlType
 */
export type Order = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  userId: Int
  /** @gqlField */
  itemIds: Int[]
  /** @gqlField */
  status: OrderStatus
  /** @gqlField */
  createdAt: DateTime
}

export const orderMap = new Map<number, Order>(
  ORDERS.map((o) => [o.id, { ...o, status: o.status as OrderStatus } as unknown as Order]),
)

export function getOrdersByUserId(userId: number): Order[] {
  return Array.from(orderMap.values()).filter((o) => o.userId === userId)
}

/** @gqlQueryField */
export function orders(): Order[] {
  return Array.from(orderMap.values())
}

/** @gqlQueryField */
export function order(id: Int): Order {
  const order = orderMap.get(id)
  if (!order) throw new GraphQLError('Order not found')
  return order
}

/** @gqlQueryField */
export function ordersByStatus(status: OrderStatus): Order[] {
  return Array.from(orderMap.values()).filter((o) => o.status === status)
}

/** @gqlField */
export function user(order: Order): User {
  const user = userMap.get(order.userId)
  if (!user) throw new GraphQLError('User not found')
  return user
}

/** @gqlField */
export function items(order: Order): MenuItem[] {
  return order.itemIds.map((id) => {
    const item = menuMap.get(id)
    if (!item) throw new GraphQLError(`Menu item not found`)
    return item
  })
}

/** @gqlMutationField */
export function createOrder(userId: Int, items: Int[]): Order {
  if (!userMap.has(userId)) throw new GraphQLError('User not found')
  if (items.length === 0) throw new GraphQLError('At least one item is required')
  for (const id of items) {
    if (!menuMap.has(id)) throw new GraphQLError(`Menu item not found`)
  }

  const id = incrementId()
  const newOrder = {
    id,
    userId,
    itemIds: items,
    status: 'PENDING',
    createdAt: new Date(),
  } as unknown as Order
  orderMap.set(id, newOrder)
  return newOrder
}

/** @gqlMutationField */
export function updateOrder(id: Int, status: OrderStatus): Order {
  const order = orderMap.get(id)
  if (!order) throw new GraphQLError('Order not found')
  order.status = status
  return order
}

/** @gqlMutationField */
export function deleteOrder(id: Int): Order | null {
  const order = orderMap.get(id)
  if (order) orderMap.delete(id)
  return order || null
}
