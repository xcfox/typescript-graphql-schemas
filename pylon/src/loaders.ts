import DataLoader from 'dataloader'
import { orderMap } from './resolvers/order.ts'
import { userMap } from './resolvers/user.ts'
import { menuItemMap } from './resolvers/menu.ts'
import { User } from './resolvers/user.ts'
import { Order } from './resolvers/order.ts'
import { MenuItem } from './resolvers/menu.ts'

export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      const allOrders = Array.from(orderMap.values())
      const orderGroups = new Map<number, Order[]>()

      for (const o of allOrders) {
        const orders = orderGroups.get(o.userId) ?? []
        orders.push(new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt))
        orderGroups.set(o.userId, orders)
      }

      return userIds.map((id) => orderGroups.get(id) ?? [])
    }),

    users: new DataLoader<number, User>(async (userIds) => {
      return userIds.map((id) => {
        const u = userMap.get(id)
        if (!u) {
          return new Error('User not found')
        }
        return new User(u.id, u.name, u.email)
      })
    }),

    menuItems: new DataLoader<number, MenuItem>(async (itemIds) => {
      return itemIds.map((id) => {
        const i = menuItemMap.get(id)
        if (!i) {
          return new Error('Menu item not found')
        }
        return new MenuItem(i.id, i.name, i.price, i.category)
      })
    }),
  }
}

export type Loaders = ReturnType<typeof createLoaders>
