import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { resolver, query, mutation, field } from '@gqloom/core'
import { USERS, incrementId } from '@coffee-shop/shared'
import { Order, orderMap } from './order.ts'

export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),
})

export const userMap = new Map<number, z.infer<typeof User>>(USERS.map((u) => [u.id, u]))

export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order))).load((users) => {
    const userOrders = new Map<number, z.infer<typeof Order>[]>()
    for (const user of users) {
      userOrders.set(
        user.id,
        Array.from(orderMap.values()).filter((o) => o.userId === user.id),
      )
    }
    return users.map((user) => userOrders.get(user.id) ?? [])
  }),

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

  deleteUser: mutation(z.nullish(User))
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const user = userMap.get(id)
      if (user) userMap.delete(id)
      return user
    }),
})
