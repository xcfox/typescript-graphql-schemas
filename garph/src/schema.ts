import { GarphSchema, buildSchema } from 'garph'
import type { Infer, InferResolvers } from 'garph'
import { GraphQLDateTime } from 'graphql-scalars'
import { GraphQLError } from 'graphql'
import { USERS, MENU_ITEMS, ORDERS, incrementId } from '@coffee-shop/shared'

const g = new GarphSchema()

const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})

const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

const SugarLevelEnum = g.enumType('SugarLevel', ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const)

const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g
    .ref(() => OrderType)
    .list()
    .omitResolver()
    .optional(),
})

const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})

const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)

const DessertType = g
  .type('Dessert', {
    calories: g.float(),
  })
  .implements(FoodInterface)

const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})

const OrderType = g.type('Order', {
  id: g.int(),
  userId: g.int(),
  itemIds: g.int().list(),
  status: g.ref(OrderStatusEnum),
  createdAt: g.ref(DateTime),
  user: g.ref(UserType).omitResolver().optional(),
  items: g.ref(MenuItemType).list().omitResolver().optional(),
})

type User = Infer<typeof UserType>
type MenuItem = Infer<typeof MenuItemType>
type Order = Infer<typeof OrderType>

const userMap = new Map<number, User>(USERS.map((u) => [u.id, u as User]))
const menuItemMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, item as MenuItem]),
)
const orderMap = new Map<number, Order>(ORDERS.map((o) => [o.id, o as Order]))

const queryType = g.type('Query', {
  users: g.ref(UserType).list(),
  user: g.ref(UserType).optional().args({
    id: g.int(),
  }),
  menu: g.ref(MenuItemType).list(),
  menuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
  }),
  orders: g.ref(OrderType).list(),
  order: g.ref(OrderType).optional().args({
    id: g.int(),
  }),
})

const mutationType = g.type('Mutation', {
  createUser: g.ref(UserType).args({
    name: g.string(),
    email: g.string(),
  }),
  updateUser: g.ref(UserType).optional().args({
    id: g.int(),
    name: g.string().optional(),
    email: g.string().optional(),
  }),
  deleteUser: g.ref(UserType).optional().args({
    id: g.int(),
  }),
  createCoffee: g.ref(CoffeeType).args({
    name: g.string(),
    price: g.float(),
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  }),
  updateCoffee: g
    .ref(CoffeeType)
    .optional()
    .args({
      id: g.int(),
      name: g.string().optional(),
      price: g.float().optional(),
      sugarLevel: g.ref(SugarLevelEnum).optional(),
      origin: g.string().optional(),
    }),
  createDessert: g.ref(DessertType).args({
    name: g.string(),
    price: g.float(),
    calories: g.float(),
  }),
  updateDessert: g.ref(DessertType).optional().args({
    id: g.int(),
    name: g.string().optional(),
    price: g.float().optional(),
    calories: g.float().optional(),
  }),
  deleteMenuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
  }),
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
})

const resolvers: InferResolvers<
  {
    Query: typeof queryType
    Mutation: typeof mutationType
    User: typeof UserType
    Order: typeof OrderType
  },
  {}
> = {
  Query: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
    menu: () => Array.from(menuItemMap.values()),
    menuItem: (_, { id }) => {
      const item = menuItemMap.get(id)
      return item || null
    },
    orders: () => Array.from(orderMap.values()),
    order: (_, { id }) => {
      const order = orderMap.get(id)
      return order || null
    },
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      if (!email.includes('@')) throw new GraphQLError('Invalid email format')
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    },
    updateUser: (_, { id, name, email }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name) user.name = name
      if (email) {
        if (!email.includes('@')) throw new GraphQLError('Invalid email format')
        user.email = email
      }
      return user
    },
    deleteUser: (_, { id }) => {
      const user = userMap.get(id)
      if (user) userMap.delete(id)
      return user || null
    },
    createCoffee: (_, { name, price, sugarLevel, origin }) => {
      const id = incrementId()
      const newItem = {
        __typename: 'Coffee' as const,
        id,
        name,
        price,
        sugarLevel,
        origin,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
    updateCoffee: (_, { id, name, price, sugarLevel, origin }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Coffee') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (sugarLevel !== undefined && sugarLevel !== null) item.sugarLevel = sugarLevel
      if (origin !== undefined && origin !== null) item.origin = origin
      return item
    },
    createDessert: (_, { name, price, calories }) => {
      const id = incrementId()
      const newItem = {
        __typename: 'Dessert' as const,
        id,
        name,
        price,
        calories,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
    updateDessert: (_, { id, name, price, calories }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Dessert') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (calories !== undefined && calories !== null) item.calories = calories
      return item
    },
    deleteMenuItem: (_, { id }) => {
      const item = menuItemMap.get(id)
      if (item) menuItemMap.delete(id)
      return item || null
    },
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
  User: {
    orders: (parent) => {
      return Array.from(orderMap.values()).filter((o) => o.userId === parent.id)
    },
  },
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

export const schema = buildSchema({ g, resolvers })
