import { Int } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import { USERS, incrementId } from '@coffee-shop/shared'
import { User } from '../models/index.ts'
import { Order } from '../models/index.ts'

// In-memory data map
export const userMap = new Map<number, { id: number; name: string; email: string }>(
  USERS.map((u) => [u.id, { ...u }]),
)

export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}

export const userMutations = {
  createUser: (name: string, email: string): User => {
    if (!email.includes('@')) throw new GraphQLError('Invalid email format')
    const id = incrementId()
    const newUser = { id, name, email }
    userMap.set(id, newUser)
    return new User(id, name, email)
  },
  updateUser: (id: Int, name?: string, email?: string): User => {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    if (name) user.name = name
    if (email) {
      if (!email.includes('@')) throw new GraphQLError('Invalid email format')
      user.email = email
    }
    return new User(user.id, user.name, user.email)
  },
  deleteUser: (id: Int): User | undefined => {
    const user = userMap.get(id)
    if (user) {
      userMap.delete(id)
      return new User(user.id, user.name, user.email)
    }
    return undefined
  },
}

