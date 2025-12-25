import 'reflect-metadata'
import { Resolver, Query, Mutation, Arg, FieldResolver, Root, Int } from 'type-graphql'
import { GraphQLError } from 'graphql'
import { USERS, incrementId } from '@coffee-shop/shared'
import { User } from './user.type.ts'
import { Order } from './order.type.ts'
import { orderMap } from './order.resolver.ts'

export const userMap = new Map<number, User>(USERS.map((u) => [u.id, Object.assign(new User(), u)]))

@Resolver(() => User)
export class UserResolver {
  @Query(() => [User])
  users(): User[] {
    return Array.from(userMap.values())
  }

  @Query(() => User)
  user(@Arg('id', () => Int) id: number): User {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    return user
  }

  @FieldResolver(() => [Order])
  orders(@Root() user: User): Order[] {
    return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
  }

  @Mutation(() => User)
  createUser(
    @Arg('name', () => String) name: string,
    @Arg('email', () => String) email: string,
  ): User {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new GraphQLError('Invalid email format')
    }

    const id = incrementId()
    const newUser = Object.assign(new User(), { id, name, email, orders: [] })
    userMap.set(id, newUser)
    return newUser
  }

  @Mutation(() => User)
  updateUser(
    @Arg('id', () => Int) id: number,
    @Arg('name', () => String, { nullable: true }) name?: string,
    @Arg('email', () => String, { nullable: true }) email?: string,
  ): User {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')

    if (name != null) user.name = name
    if (email != null) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new GraphQLError('Invalid email format')
      }
      user.email = email
    }

    return user
  }

  @Mutation(() => User, { nullable: true })
  deleteUser(@Arg('id', () => Int) id: number): User | null {
    const user = userMap.get(id)
    if (user) userMap.delete(id)
    return user || null
  }
}

