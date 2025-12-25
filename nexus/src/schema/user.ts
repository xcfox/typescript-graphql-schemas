import { objectType, extendType, intArg, stringArg, nonNull } from 'nexus'
import { USERS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import * as z from 'zod'
import { Order, orderMap } from './order.ts'
import { parse } from '../utils/validate.ts'

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.string('email')
    t.nonNull.list.nonNull.field('orders', {
      type: Order,
      resolve(parent) {
        return Array.from(orderMap.values()).filter((order) => order.userId === parent.id)
      },
    })
  },
})

// In-memory data store
export const userMap = new Map<number, { id: number; name: string; email: string }>(
  USERS.map((u) => [u.id, { ...u }]),
)

export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('users', {
      type: User,
      resolve() {
        return Array.from(userMap.values())
      },
    })

    t.nonNull.field('user', {
      type: User,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const user = userMap.get(id)
        if (!user) {
          throw new GraphQLError('User not found')
        }
        return user
      },
    })
  },
})

export const UserMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createUser', {
      type: User,
      args: {
        name: nonNull(stringArg()),
        email: nonNull(stringArg()),
      },
      resolve(_parent, { name, email }) {
        // Validate email format
        parse(z.string().email(), email)

        const id = incrementId()
        const newUser = { id, name, email }
        userMap.set(id, newUser)
        return newUser
      },
    })

    t.nonNull.field('updateUser', {
      type: User,
      args: {
        id: nonNull(intArg()),
        name: stringArg(),
        email: stringArg(),
      },
      resolve(_parent, { id, name, email }) {
        const user = userMap.get(id)
        if (!user) {
          throw new GraphQLError('User not found')
        }

        if (email != null) {
          parse(z.email(), email)
          user.email = email
        }

        if (name != null) {
          user.name = name
        }

        return user
      },
    })

    t.field('deleteUser', {
      type: User,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const user = userMap.get(id)
        if (user) {
          userMap.delete(id)
        }
        return user || null
      },
    })
  },
})
