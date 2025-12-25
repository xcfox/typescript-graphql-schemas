import DataLoader from 'dataloader'
import { Order } from './resolvers/order.type.ts'
import { orderMap } from './resolvers/order.resolver.ts'

export class MyContext {
  loaders!: {
    userOrders: DataLoader<number, Order[]>
  }
}

export function createLoaders() {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      const userOrders = new Map<number, Order[]>()
      for (const order of orderMap.values()) {
        const orders = userOrders.get(order.userId) ?? []
        orders.push(order)
        userOrders.set(order.userId, orders)
      }
      return userIds.map((id) => userOrders.get(id) ?? [])
    }),
  }
}
