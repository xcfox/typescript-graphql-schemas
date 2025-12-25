import { builder } from '../builder.ts'
import { USERS, incrementId } from '@coffee-shop/shared'
import { z } from 'zod'
import { GraphQLError } from 'graphql'
import { OrderRef, orderMap } from './order.ts'

export interface UserShape {
  id: number
  name: string
  email: string
}

export const userMap = new Map<number, UserShape>(USERS.map((u) => [u.id, u]))

export const UserRef = builder.objectRef<UserShape>('User')

UserRef.implement({
  fields: (t) => ({
    id: t.exposeInt('id'),
    name: t.exposeString('name'),
    email: t.exposeString('email'),
    orders: t.field({
      type: [OrderRef],
      resolve: (user) => {
        return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
      },
    }),
  }),
})

builder.queryFields((t) => ({
  users: t.field({
    type: [UserRef],
    resolve: () => Array.from(userMap.values()),
  }),
  user: t.field({
    type: UserRef,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  }),
}))

builder.mutationFields((t) => ({
  createUser: t.field({
    type: UserRef,
    args: {
      name: t.arg.string({ required: true }),
      email: t.arg.string({
        required: true,
        validate: z.string().email(),
      }),
    },
    resolve: (_parent, { name, email }) => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    },
  }),
  updateUser: t.field({
    type: UserRef,
    args: {
      id: t.arg.int({ required: true }),
      name: t.arg.string(),
      email: t.arg.string({
        validate: z.string().email(),
      }),
    },
    resolve: (_parent, { id, name, email }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name != null) user.name = name
      if (email != null) user.email = email
      return user
    },
  }),
  deleteUser: t.field({
    type: UserRef,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const user = userMap.get(id)
      if (user) userMap.delete(id)
      return user || null
    },
  }),
}))
