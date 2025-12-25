import 'reflect-metadata'
import { Resolver, Query, Mutation, Arg, FieldResolver, Root, Int } from 'type-graphql'
import { GraphQLError } from 'graphql'
import { ORDERS, incrementId } from '@coffee-shop/shared'
import { Order, OrderStatus } from './order.type.ts'
import { User } from './user.type.ts'
import { MenuItem } from './menu.type.ts'
import { userMap } from './user.resolver.ts'
import { menuMap } from './menu.resolver.ts'

export const orderMap = new Map<number, Order>(
  ORDERS.map((o) => [
    o.id,
    Object.assign(new Order(), {
      ...o,
      status: o.status as OrderStatus,
    }),
  ]),
)

@Resolver(() => Order)
export class OrderResolver {
  @Query(() => [Order])
  orders(): Order[] {
    return Array.from(orderMap.values())
  }

  @Query(() => Order)
  order(@Arg('id', () => Int) id: number): Order {
    const order = orderMap.get(id)
    if (!order) throw new GraphQLError('Order not found')
    return order
  }

  @FieldResolver(() => User, { nullable: true })
  user(@Root() order: Order): User | null {
    return userMap.get(order.userId) || null
  }

  @FieldResolver(() => [MenuItem])
  items(@Root() order: Order): MenuItem[] {
    return order.itemIds
      .map((id) => menuMap.get(id))
      .filter((item): item is MenuItem => item != null)
  }

  @Mutation(() => Order)
  createOrder(
    @Arg('userId', () => Int) userId: number,
    @Arg('items', () => [Int]) items: number[],
  ): Order {
    // Validate userId exists
    if (!userMap.has(userId)) {
      throw new GraphQLError('User not found')
    }

    // Validate items exist and array is not empty
    if (items.length === 0) {
      throw new GraphQLError('At least one item is required')
    }

    for (const itemId of items) {
      if (!menuMap.has(itemId)) {
        throw new GraphQLError('Menu item not found')
      }
    }

    const id = incrementId()
    const newOrder = Object.assign(new Order(), {
      id,
      userId,
      itemIds: items,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      items: [],
    })
    orderMap.set(id, newOrder)
    return newOrder
  }

  @Mutation(() => Order)
  updateOrder(
    @Arg('id', () => Int) id: number,
    @Arg('status', () => OrderStatus) status: OrderStatus,
  ): Order {
    const order = orderMap.get(id)
    if (!order) throw new GraphQLError('Order not found')
    order.status = status
    return order
  }

  @Mutation(() => Order, { nullable: true })
  deleteOrder(@Arg('id', () => Int) id: number): Order | null {
    const order = orderMap.get(id)
    if (order) orderMap.delete(id)
    return order || null
  }
}

