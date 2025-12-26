import { g } from '../g.ts'
import { GraphQLError } from 'graphql'
import { USERS, incrementId } from '@coffee-shop/shared'
import type { Infer } from 'garph'
import { orderMap, Order } from './order.ts'

export const User = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g.ref(() => Order).list(),
})

export type UserType = Infer<typeof User>

export const userMap = new Map<number, UserType>(
  USERS.map((u) => [u.id, { ...u, orders: [] } as UserType])
)

export const userQuery = {
  users: g
    .ref(() => User)
    .list()
    .description('Get all users'),
  user: g
    .ref(() => User)
    .args({
      id: g.int(),
    })
    .description('Get a user by ID'),
}

export const userMutation = {
  createUser: g
    .ref(() => User)
    .args({
      name: g.string(),
      email: g.string(),
    })
    .description('Create a new user'),
  updateUser: g
    .ref(() => User)
    .args({
      id: g.int(),
      name: g.string().optional(),
      email: g.string().optional(),
    })
    .description('Update a user'),
  deleteUser: g
    .ref(() => User)
    .optional()
    .args({
      id: g.int(),
    })
    .description('Delete a user'),
}

export const userResolvers = {
  User: {
    orders: (user: UserType) => {
      return Array.from(orderMap.values()).filter((order) => order.userId === user.id)
    },
  },
  Query: {
    users: () => Array.from(userMap.values()),
    user: (_: any, { id }: { id: number }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
  Mutation: {
    createUser: (_: any, { name, email }: any) => {
      if (!email.includes('@')) throw new GraphQLError('Invalid email format')
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser as UserType)
      return newUser
    },
    updateUser: (_: any, { id, name, email }: any) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name !== undefined) user.name = name
      if (email !== undefined) user.email = email
      return user
    },
    deleteUser: (_: any, { id }: { id: number }) => {
      const user = userMap.get(id)
      if (user) userMap.delete(id)
      return user
    },
  },
}

