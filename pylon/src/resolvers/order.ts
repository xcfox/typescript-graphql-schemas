import { Int, createDecorator, ServiceError, getContext } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { userMap, User } from './user.ts'
import { menuItemMap, MenuItem } from './menu.ts'
import type { Loaders } from '../loaders.ts'

// Enums
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

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

// Validation Decorators
const validateCreateOrder = createDecorator(async (userId: Int, items: Int[]) => {
  if (items.length === 0) {
    throw new ServiceError('At least one item is required', {
      code: 'INVALID_ORDER',
      statusCode: 400,
    })
  }
  if (!userMap.has(userId)) {
    throw new ServiceError('User not found', {
      code: 'USER_NOT_FOUND',
      statusCode: 400,
    })
  }
  for (const itemId of items) {
    if (!menuItemMap.has(itemId)) {
      throw new ServiceError('Menu item not found', {
        code: 'MENU_ITEM_NOT_FOUND',
        statusCode: 400,
      })
    }
  }
})

// Model Class
export class Order {
  constructor(
    public id: Int,
    public userId: Int,
    public itemIds: Int[],
    public status: OrderStatus,
    public createdAt: Date,
  ) {}

  async user(): Promise<User> {
    const loaders = getContext().get('loaders')
    return loaders.users.load(this.userId)
  }

  async items(): Promise<MenuItem[]> {
    const loaders = getContext().get('loaders')
    return loaders.menuItems.loadMany(this.itemIds) as Promise<MenuItem[]>
  }
}

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
  createOrder: validateCreateOrder((userId: Int, items: Int[]): Order => {
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
  }),
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
