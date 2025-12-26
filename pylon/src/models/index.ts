import { Int } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import { orderMap } from '../resolvers/order.ts'
import { userMap } from '../resolvers/user.ts'
import { menuItemMap } from '../resolvers/menu.ts'

// Enums
export type MenuCategory = 'COFFEE' | 'FOOD'
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

// Model Classes
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}

  orders(): Order[] {
    return Array.from(orderMap.values())
      .filter((o) => o.userId === this.id)
      .map((o) => new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt))
  }
}

export class MenuItem {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public category: MenuCategory,
  ) {}
}

export class Order {
  constructor(
    public id: Int,
    public userId: Int,
    public itemIds: Int[],
    public status: OrderStatus,
    public createdAt: Date,
  ) {}

  user(): User {
    const user = userMap.get(this.userId)
    if (!user) throw new GraphQLError('User not found')
    return new User(user.id, user.name, user.email)
  }

  items(): MenuItem[] {
    return this.itemIds.map((id) => {
      const item = menuItemMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return new MenuItem(item.id, item.name, item.price, item.category)
    })
  }
}
