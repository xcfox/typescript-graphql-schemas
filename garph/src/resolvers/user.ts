import { g, UserType, userMap, orderMap } from '../schema.ts'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import type { InferResolvers } from 'garph'

export const userResolvers: InferResolvers<{ User: typeof UserType }, {}> = {
  User: {
    orders: (parent) => {
      return Array.from(orderMap.values()).filter((o) => o.userId === parent.id)
    },
  },
}

export const userQueryFields = {
  users: g.ref(UserType).list(),
  user: g.ref(UserType).optional().args({
    id: g.int(),
  }),
}

const UserQuery = g.type('UserQuery', userQueryFields)

export const userQueryResolvers: InferResolvers<{ UserQuery: typeof UserQuery }, {}> = {
  UserQuery: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
}

export const userMutationFields = {
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
}

const UserMutation = g.type('UserMutation', userMutationFields)

export const userMutationResolvers: InferResolvers<{ UserMutation: typeof UserMutation }, {}> = {
  UserMutation: {
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
  },
}
