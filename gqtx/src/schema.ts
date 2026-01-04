import { Gql, buildGraphQLSchema } from 'gqtx'
import { GraphQLDateTime } from 'graphql-scalars'
import { GraphQLError } from 'graphql'
import { USERS, MENU_ITEMS, ORDERS, incrementId } from '@coffee-shop/shared'

// ============================================================================
// Types
// ============================================================================

type User = {
  id: number
  name: string
  email: string
}

type Coffee = {
  __typename: 'Coffee'
  id: number
  name: string
  price: number
  sugarLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  origin: string
}

type Dessert = {
  __typename: 'Dessert'
  id: number
  name: string
  price: number
  calories: number
}

type MenuItem = Coffee | Dessert

type Order = {
  id: number
  userId: number
  itemIds: number[]
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
}

// ============================================================================
// Data Storage
// ============================================================================

const userMap = new Map<number, User>(USERS.map((u) => [u.id, { ...u }]))
const menuItemMap = new Map<number, MenuItem>(MENU_ITEMS.map((item) => [item.id, item as MenuItem]))
const orderMap = new Map<number, Order>(
  ORDERS.map((o) => [o.id, { ...o, status: o.status as Order['status'] }]),
)

// ============================================================================
// GraphQL Types: Scalars & Enums
// ============================================================================

const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})

const SugarLevelEnum = Gql.Enum({
  name: 'SugarLevel',
  description: 'Sugar level for coffee',
  values: [
    { name: 'NONE', value: 'NONE' },
    { name: 'LOW', value: 'LOW' },
    { name: 'MEDIUM', value: 'MEDIUM' },
    { name: 'HIGH', value: 'HIGH' },
  ],
})

const OrderStatusEnum = Gql.Enum({
  name: 'OrderStatus',
  description: 'Order status',
  values: [
    { name: 'PENDING', value: 'PENDING' },
    { name: 'COMPLETED', value: 'COMPLETED' },
    { name: 'CANCELLED', value: 'CANCELLED' },
  ],
})

// ============================================================================
// GraphQL Types: Interface
// ============================================================================

const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  description: 'Food interface with common fields',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})

// ============================================================================
// GraphQL Types: Objects (with forward declarations for circular references)
// ============================================================================

// Forward declaration for OrderType to handle circular reference
let OrderType: ReturnType<typeof Gql.Object<Order>>

const UserType = Gql.Object<User>({
  name: 'User',
  description: 'User information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
    Gql.Field({
      name: 'orders',
      type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
      resolve: (user) => {
        return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
      },
    }),
  ],
})

const CoffeeType = Gql.Object<Coffee>({
  name: 'Coffee',
  description: 'Coffee menu item',
  interfaces: [FoodInterface],
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})

const DessertType = Gql.Object<Dessert>({
  name: 'Dessert',
  description: 'Dessert menu item',
  interfaces: [FoodInterface],
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'calories', type: Gql.NonNull(Gql.Float) }),
  ],
})

const MenuItemType = Gql.Union({
  name: 'MenuItem',
  description: 'Menu item union type',
  types: [CoffeeType, DessertType],
  resolveType: (value: MenuItem) => {
    return value.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})

OrderType = Gql.Object<Order>({
  name: 'Order',
  description: 'Order information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'userId', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'itemIds', type: Gql.NonNull(Gql.List(Gql.NonNull(Gql.Int))) }),
    Gql.Field({ name: 'status', type: Gql.NonNull(OrderStatusEnum) }),
    Gql.Field({ name: 'createdAt', type: Gql.NonNull(DateTime) }),
    Gql.Field({
      name: 'user',
      type: Gql.NonNull(UserType),
      resolve: (order) => {
        const user = userMap.get(order.userId)
        if (!user) throw new Error('User not found')
        return user
      },
    }),
    Gql.Field({
      name: 'items',
      type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
      resolve: (order) => {
        return order.itemIds.map((id) => {
          const item = menuItemMap.get(id)
          if (!item) throw new Error(`Menu item ${id} not found`)
          return item
        })
      },
    }),
  ],
})

// ============================================================================
// Query & Mutation
// ============================================================================

const query = Gql.Query({
  fields: () => [
    Gql.Field({
      name: 'users',
      type: Gql.NonNull(Gql.List(Gql.NonNull(UserType))),
      resolve: () => Array.from(userMap.values()),
    }),
    Gql.Field({
      name: 'user',
      type: UserType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      resolve: (_, { id }) => {
        const user = userMap.get(id)
        if (!user) throw new GraphQLError('User not found')
        return user
      },
    }),
    Gql.Field({
      name: 'menu',
      type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
      resolve: () => Array.from(menuItemMap.values()),
    }),
    Gql.Field({
      name: 'menuItem',
      type: MenuItemType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      resolve: (_, { id }) => {
        const item = menuItemMap.get(id)
        if (!item) throw new GraphQLError('Menu item not found')
        return item
      },
    }),
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
  ],
})

const mutation = Gql.Mutation({
  fields: () => [
    Gql.Field({
      name: 'createUser',
      type: Gql.NonNull(UserType),
      args: {
        name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
        email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      },
      resolve: (_, { name, email }) => {
        if (!email.includes('@')) throw new GraphQLError('Invalid email format')
        const id = incrementId()
        const newUser: User = { id, name, email }
        userMap.set(id, newUser)
        return newUser
      },
    }),
    Gql.Field({
      name: 'updateUser',
      type: UserType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
        name: Gql.Arg({ type: Gql.String }),
        email: Gql.Arg({ type: Gql.String }),
      },
      resolve: (_, { id, name, email }) => {
        const user = userMap.get(id)
        if (!user) throw new GraphQLError('User not found')
        if (name !== undefined && name !== null) user.name = name
        if (email !== undefined && email !== null) {
          if (!email.includes('@')) throw new GraphQLError('Invalid email format')
          user.email = email
        }
        return user
      },
    }),
    Gql.Field({
      name: 'deleteUser',
      type: UserType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      resolve: (_, { id }) => {
        const user = userMap.get(id)
        if (user) userMap.delete(id)
        return user ?? null
      },
    }),
    Gql.Field({
      name: 'createCoffee',
      type: Gql.NonNull(CoffeeType),
      args: {
        name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
        price: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
        sugarLevel: Gql.Arg({ type: Gql.NonNullInput(SugarLevelEnum) }),
        origin: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      },
      resolve: (_, { name, price, sugarLevel, origin }) => {
        const id = incrementId()
        const newItem: Coffee = {
          __typename: 'Coffee',
          id,
          name,
          price,
          sugarLevel: sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH',
          origin,
        }
        menuItemMap.set(id, newItem)
        return newItem
      },
    }),
    Gql.Field({
      name: 'updateCoffee',
      type: CoffeeType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
        name: Gql.Arg({ type: Gql.String }),
        price: Gql.Arg({ type: Gql.Float }),
        sugarLevel: Gql.Arg({ type: SugarLevelEnum }),
        origin: Gql.Arg({ type: Gql.String }),
      },
      resolve: (_, { id, name, price, sugarLevel, origin }) => {
        const item = menuItemMap.get(id)
        if (!item || item.__typename !== 'Coffee') return null
        if (name !== undefined && name !== null) item.name = name
        if (price !== undefined && price !== null) item.price = price
        if (sugarLevel !== undefined && sugarLevel !== null)
          item.sugarLevel = sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
        if (origin !== undefined && origin !== null) item.origin = origin
        return item
      },
    }),
    Gql.Field({
      name: 'createDessert',
      type: Gql.NonNull(DessertType),
      args: {
        name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
        price: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
        calories: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
      },
      resolve: (_, { name, price, calories }) => {
        const id = incrementId()
        const newItem: Dessert = {
          __typename: 'Dessert',
          id,
          name,
          price,
          calories,
        }
        menuItemMap.set(id, newItem)
        return newItem
      },
    }),
    Gql.Field({
      name: 'updateDessert',
      type: DessertType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
        name: Gql.Arg({ type: Gql.String }),
        price: Gql.Arg({ type: Gql.Float }),
        calories: Gql.Arg({ type: Gql.Float }),
      },
      resolve: (_, { id, name, price, calories }) => {
        const item = menuItemMap.get(id)
        if (!item || item.__typename !== 'Dessert') return null
        if (name !== undefined && name !== null) item.name = name
        if (price !== undefined && price !== null) item.price = price
        if (calories !== undefined && calories !== null) item.calories = calories
        return item
      },
    }),
    Gql.Field({
      name: 'deleteMenuItem',
      type: MenuItemType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      resolve: (_, { id }) => {
        const item = menuItemMap.get(id)
        if (item) menuItemMap.delete(id)
        return item ?? null
      },
    }),
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
  ],
})

// ============================================================================
// Schema
// ============================================================================

export const schema = buildGraphQLSchema({ query, mutation })
