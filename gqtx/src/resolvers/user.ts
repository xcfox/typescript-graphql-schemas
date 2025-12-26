import { Gql } from 'gqtx'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import { UserType, userMap } from './types.ts'
import type { User } from './types.ts'

export const userQueryFields = [
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
]

export const userMutationFields = [
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
]
