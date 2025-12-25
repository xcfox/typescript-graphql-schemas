import { Field, ObjectType, registerEnumType, Int } from 'type-graphql'
import { GraphQLDateTime } from 'graphql-scalars'
import { User } from './user.type.ts'
import { MenuItem } from './menu.type.ts'

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
})

@ObjectType()
export class Order {
  @Field(() => Int)
  id!: number

  @Field(() => GraphQLDateTime)
  createdAt!: Date

  @Field(() => OrderStatus)
  status!: OrderStatus

  @Field(() => Int)
  userId!: number

  @Field(() => [Int])
  itemIds!: number[]

  @Field(() => User, { nullable: true })
  user?: User | null

  @Field(() => [MenuItem])
  items!: MenuItem[]
}

