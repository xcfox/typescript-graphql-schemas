import { Int, createDecorator, ServiceError, getContext } from '@getcronit/pylon'
import { GraphQLError } from 'graphql'
import { USERS, incrementId } from '@coffee-shop/shared'
import { orderMap, Order } from './order.ts'
import type { Loaders } from '../loaders.ts'

// In-memory data map
export const userMap = new Map<number, { id: number; name: string; email: string }>(
  USERS.map((u) => [u.id, { ...u }]),
)

// Validation Decorators
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

const validateEmailOptional = createDecorator(async (id: Int, name?: string, email?: string) => {
  if (email !== undefined && (!email || !email.includes('@'))) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// Model Class
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}

  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}

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
  createUser: validateEmail((name: string, email: string): User => {
    const id = incrementId()
    const newUser = { id, name, email }
    userMap.set(id, newUser)
    return new User(id, name, email)
  }),
  updateUser: validateEmailOptional((id: Int, name?: string, email?: string): User => {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    if (name) user.name = name
    if (email) {
      user.email = email
    }
    return new User(user.id, user.name, user.email)
  }),
  deleteUser: (id: Int): User | undefined => {
    const user = userMap.get(id)
    if (user) {
      userMap.delete(id)
      return new User(user.id, user.name, user.email)
    }
    return undefined
  },
}
