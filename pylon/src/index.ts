import { app, Int, createDecorator, ServiceError, getContext } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import DataLoader from 'dataloader'
import { USERS, MENU_ITEMS, ORDERS, incrementId } from '@coffee-shop/shared'

// ============================================================================
// Types & Enums
// ============================================================================

export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface Food {
  id: Int
  name: string
  price: number
}

// ============================================================================
// Data Storage
// ============================================================================

// In-memory data maps
export const userMap = new Map<number, { id: number; name: string; email: string }>(
  USERS.map((u) => [u.id, { ...u }]),
)

type CoffeeItem = {
  __typename: 'Coffee'
  id: number
  name: string
  price: number
  sugarLevel: SugarLevel
  origin: string
}

type DessertItem = {
  __typename: 'Dessert'
  id: number
  name: string
  price: number
  calories: number
}

type MenuItemType = CoffeeItem | DessertItem

export const menuItemMap = new Map<number, MenuItemType>(
  MENU_ITEMS.map((item) => [item.id, item as MenuItemType]),
)

export const orderMap = new Map<
  number,
  {
    id: number
    userId: number
    itemIds: number[]
    status: OrderStatus
    createdAt: Date
  }
>(ORDERS.map((o) => [o.id, o]))

// ============================================================================
// Model Classes
// ============================================================================

export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

export class Dessert implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public calories: number,
  ) {}
}

// Union 类型: MenuItem = Coffee | Dessert
// Pylon 会自动将 TypeScript 联合类型转换为 GraphQL Union 类型
export type MenuItem = Coffee | Dessert

export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}

  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}

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
    const items = await loaders.menuItems.loadMany(this.itemIds)
    return items.filter(
      (item): item is MenuItem => item instanceof Coffee || item instanceof Dessert,
    )
  }
}

// ============================================================================
// Validation Decorators
// ============================================================================

const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

const validateEmailOptional = createDecorator(async (id: Int, name?: string, email?: string) => {
  if (email !== undefined && (!email || !email.includes('@'))) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

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

// ============================================================================
// DataLoaders
// ============================================================================

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
        if (i.__typename === 'Coffee') {
          return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
        } else {
          return new Dessert(i.id, i.name, i.price, i.calories)
        }
      })
    }),
  }
}

export type Loaders = ReturnType<typeof createLoaders>

// ============================================================================
// GraphQL Resolvers
// ============================================================================

// Add loaders to context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

export const graphql = {
  Query: {
    // User queries
    users: (): User[] => {
      return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
    },
    user: (id: Int): User => {
      const u = userMap.get(id)
      if (!u) throw new GraphQLError('User not found')
      return new User(u.id, u.name, u.email)
    },

    // Menu queries
    menu: (): MenuItem[] => {
      return Array.from(menuItemMap.values()).map((i) => {
        if (i.__typename === 'Coffee') {
          return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
        } else {
          return new Dessert(i.id, i.name, i.price, i.calories)
        }
      })
    },
    menuItem: (id: Int): MenuItem | undefined => {
      const i = menuItemMap.get(id)
      if (!i) return undefined
      if (i.__typename === 'Coffee') {
        return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
      } else {
        return new Dessert(i.id, i.name, i.price, i.calories)
      }
    },

    // Order queries
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
  },
  Mutation: {
    // User mutations
    createUser: validateEmail((name: string, email: string): User => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return new User(id, name, email)
    }),
    updateUser: validateEmailOptional((id: Int, name?: string, email?: string): User => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name) user.name = name
      if (email) {
        user.email = email
      }
      return new User(user.id, user.name, user.email)
    }),
    deleteUser: (id: Int): User | undefined => {
      const user = userMap.get(id)
      if (user) {
        userMap.delete(id)
        return new User(user.id, user.name, user.email)
      }
      return undefined
    },

    // Menu mutations
    createCoffee: (name: string, price: number, sugarLevel: SugarLevel, origin: string): Coffee => {
      const id = incrementId()
      const newItem: CoffeeItem = {
        __typename: 'Coffee',
        id,
        name,
        price,
        sugarLevel,
        origin,
      }
      menuItemMap.set(id, newItem)
      return new Coffee(id, name, price, sugarLevel, origin)
    },
    updateCoffee: (
      id: Int,
      name?: string,
      price?: number,
      sugarLevel?: SugarLevel,
      origin?: string,
    ): Coffee | undefined => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Coffee') return undefined
      if (name !== undefined) item.name = name
      if (price !== undefined) item.price = price
      if (sugarLevel !== undefined) item.sugarLevel = sugarLevel
      if (origin !== undefined) item.origin = origin
      return new Coffee(item.id, item.name, item.price, item.sugarLevel, item.origin)
    },
    createDessert: (name: string, price: number, calories: number): Dessert => {
      const id = incrementId()
      const newItem: DessertItem = {
        __typename: 'Dessert',
        id,
        name,
        price,
        calories,
      }
      menuItemMap.set(id, newItem)
      return new Dessert(id, name, price, calories)
    },
    updateDessert: (
      id: Int,
      name?: string,
      price?: number,
      calories?: number,
    ): Dessert | undefined => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Dessert') return undefined
      if (name !== undefined) item.name = name
      if (price !== undefined) item.price = price
      if (calories !== undefined) item.calories = calories
      return new Dessert(item.id, item.name, item.price, item.calories)
    },
    deleteMenuItem: (id: Int): MenuItem | undefined => {
      const item = menuItemMap.get(id)
      if (item) {
        menuItemMap.delete(id)
        if (item.__typename === 'Coffee') {
          return new Coffee(item.id, item.name, item.price, item.sugarLevel, item.origin)
        } else {
          return new Dessert(item.id, item.name, item.price, item.calories)
        }
      }
      return undefined
    },

    // Order mutations
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
  },
}

export default app
