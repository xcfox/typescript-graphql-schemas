import { USERS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import { getOrdersByUserId } from './order.ts'
import type { Order } from './order.ts'
import type { Int } from 'grats'

/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}

export const userMap = new Map<number, User>(USERS.map((u) => [u.id, { ...u } as unknown as User]))

/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())
}

/** @gqlQueryField */
export function user(id: Int): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  return user
}

/** @gqlField */
export function orders(user: User): Order[] {
  return getOrdersByUserId(user.id)
}

/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}

/** @gqlMutationField */
export function updateUser(id: Int, name?: string | null, email?: string | null): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  if (name != null) user.name = name
  if (email != null) {
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    user.email = email
  }
  return user
}

/** @gqlMutationField */
export function deleteUser(id: Int): User | null {
  const user = userMap.get(id)
  if (user) userMap.delete(id)
  return user || null
}
