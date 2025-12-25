import { Field, ObjectType, Int } from 'type-graphql'
import { Order } from './order.type.ts'

@ObjectType()
export class User {
  @Field(() => Int)
  id!: number

  @Field(() => String)
  name!: string

  @Field(() => String)
  email!: string

  @Field(() => [Order])
  orders!: Order[]
}

