import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { resolver, query, mutation, field, weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import { USERS, MENU_ITEMS, ORDERS, incrementId } from '@coffee-shop/shared'

// --- In-Memory Maps ---
const userMap = new Map<number, z.infer<typeof User>>(USERS.map((u) => [u.id, u]))
const menuMap = new Map<number, z.infer<typeof MenuItem>>(MENU_ITEMS.map((i) => [i.id, i]))
const orderMap = new Map<number, z.infer<typeof Order>>(ORDERS.map((o) => [o.id, o]))

// --- Types ---

export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),
})

export const Category = z.enum(['COFFEE', 'FOOD'])

export const MenuItem = z.object({
  __typename: z.literal('Menu').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
  category: Category,
})

export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])

export const Order = z.object({
  __typename: z.literal('Order').nullish(),
  id: z.int(),
  createdAt: z.date(),
  status: OrderStatus,
  userId: z.int(),
  itemIds: z.array(z.int()),
})

// --- Resolvers ---

export const userResolver = resolver.of(User, {
  users: query(z.array(User)).resolve(() => Array.from(userMap.values())),

  user: query(User)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    }),

  createUser: mutation(User)
    .input({
      name: z.string(),
      email: z.email(),
    })
    .resolve(({ name, email }) => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    }),

  updateUser: mutation(User)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      email: z.email().nullish(),
    })
    .resolve(({ id, name, email }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name != null) user.name = name
      if (email != null) user.email = email
      return user
    }),

  deleteUser: mutation(z.boolean())
    .input({ id: z.int() })
    .resolve(({ id }) => {
      return userMap.delete(id)
    }),

  orders: field(z.array(Order)).resolve((user) => {
    return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
  }),
})

export const menuResolver = resolver({
  menu: query(z.array(MenuItem)).resolve(() => Array.from(menuMap.values())),

  menuItem: query(MenuItem)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return item
    }),

  createMenuItem: mutation(MenuItem)
    .input({
      name: z.string(),
      price: z.number(),
      category: Category,
    })
    .resolve(({ name, price, category }) => {
      const id = incrementId()
      const newItem = { id, name, price, category }
      menuMap.set(id, newItem)
      return newItem
    }),

  updateMenuItem: mutation(MenuItem)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      price: z.number().nullish(),
      category: Category.nullish(),
    })
    .resolve(({ id, name, price, category }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (category != null) item.category = category
      return item
    }),

  deleteMenuItem: mutation(z.boolean())
    .input({ id: z.int() })
    .resolve(({ id }) => {
      return menuMap.delete(id)
    }),
})

export const orderResolver = resolver.of(Order, {
  orders: query(z.array(Order)).resolve(() => Array.from(orderMap.values())),

  order: query(Order)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      return order
    }),

  createOrder: mutation(Order)
    .input({
      userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
      items: z
        .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
        .min(1, 'At least one item is required'),
    })
    .resolve(({ userId, items }) => {
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
    }),

  updateOrder: mutation(Order)
    .input({
      id: z.int(),
      status: OrderStatus,
    })
    .resolve(({ id, status }) => {
      const order = orderMap.get(id)
      if (!order) throw new GraphQLError('Order not found')
      order.status = status
      return order
    }),

  deleteOrder: mutation(z.boolean())
    .input({ id: z.int() })
    .resolve(({ id }) => {
      return orderMap.delete(id)
    }),

  user: field(z.nullish(User)).resolve((order) => {
    return userMap.get(order.userId)
  }),

  items: field(z.array(MenuItem)).resolve((order) => {
    return order.itemIds
      .map((itemId) => menuMap.get(itemId))
      .filter((i): i is any => i !== undefined)
  }),
})

// --- Schema Weaving ---

export const schema = weave(ZodWeaver, userResolver, menuResolver, orderResolver)
