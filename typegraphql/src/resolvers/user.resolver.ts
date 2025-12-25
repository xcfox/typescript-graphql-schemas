import 'reflect-metadata'
import {
  Resolver,
  Query,
  Mutation,
  Arg,
  FieldResolver,
  Root,
  Int,
  Args,
  ArgsType,
  Field,
  Ctx,
} from 'type-graphql'
import { IsEmail, IsOptional } from 'class-validator'
import { GraphQLError } from 'graphql'
import { USERS, incrementId } from '@coffee-shop/shared'
import { User } from './user.type.ts'
import { Order } from './order.type.ts'
import { MyContext } from '../context.ts'

export const userMap = new Map<number, User>(USERS.map((u) => [u.id, Object.assign(new User(), u)]))

@ArgsType()
class CreateUserArgs {
  @Field(() => String)
  name!: string

  @Field(() => String)
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string
}

@ArgsType()
class UpdateUserArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  name?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string
}

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
  async orders(@Root() user: User, @Ctx() { loaders }: MyContext): Promise<Order[]> {
    return loaders.userOrders.load(user.id)
  }

  @Mutation(() => User)
  createUser(@Args(() => CreateUserArgs) { name, email }: CreateUserArgs): User {
    const id = incrementId()
    const newUser = Object.assign(new User(), { id, name, email, orders: [] })
    userMap.set(id, newUser)
    return newUser
  }

  @Mutation(() => User)
  updateUser(
    @Arg('id', () => Int) id: number,
    @Args(() => UpdateUserArgs) { name, email }: UpdateUserArgs,
  ): User {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')

    if (name != null) user.name = name
    if (email != null) user.email = email

    return user
  }

  @Mutation(() => User, { nullable: true })
  deleteUser(@Arg('id', () => Int) id: number): User | null {
    const user = userMap.get(id)
    if (user) userMap.delete(id)
    return user || null
  }
}
