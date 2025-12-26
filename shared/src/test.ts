import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { type ExecutionResult, type GraphQLSchema, execute as executeGraphQL, parse } from 'graphql'
import { USERS, MENU_ITEMS, ORDERS } from './index.ts'

export type ExecuteFn = <TData = any>(
  query: string,
  variables?: Record<string, any>,
) => Promise<ExecutionResult<TData>>

export function runTests(schemaOrExecute: GraphQLSchema | ExecuteFn, createContext?: () => any) {
  const execute: ExecuteFn =
    typeof schemaOrExecute === 'function'
      ? schemaOrExecute
      : async <TData = any>(query: string, variables?: Record<string, any>) => {
          const document = parse(query)
          const result = await executeGraphQL({
            schema: schemaOrExecute,
            document,
            variableValues: variables,
            contextValue: createContext?.(),
          })
          return result as ExecutionResult<TData>
        }

  const initialUserIds = USERS.map((u) => u.id)
  const initialMenuItemIds = MENU_ITEMS.map((i) => i.id)

  describe('User Module', () => {
    it('should return all users', async () => {
      const result = await execute(/* GraphQL */ `
        query {
          users {
            id
            name
            email
          }
        }
      `)
      assert.strictEqual(result.errors, undefined)
      const users = result.data?.users.filter((u: any) => initialUserIds.includes(u.id))
      assert.deepEqual(users, USERS)
    })

    it('should return a user by id', async () => {
      const user = USERS[0]
      const result = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            user(id: $id) {
              id
              name
              email
            }
          }
        `,
        { id: user.id },
      )
      assert.strictEqual(result.errors, undefined)
      assert.deepEqual(result.data?.user, user)
    })

    it('should throw error for non-existent user', async () => {
      const result = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            user(id: $id) {
              id
            }
          }
        `,
        { id: 9999 },
      )
      assert.ok(result.errors)
      assert.strictEqual(result.errors[0].message, 'User not found')
    })

    it('should resolve user orders (Relational)', async () => {
      const user = USERS[0]
      const result = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            user(id: $id) {
              orders {
                id
                userId
              }
            }
          }
        `,
        { id: user.id },
      )
      assert.strictEqual(result.errors, undefined)
      const userOrders = result.data?.user?.orders
      assert.ok(Array.isArray(userOrders))
      userOrders.forEach((o: any) => assert.strictEqual(o.userId, user.id))
    })

    it('should create a new user', async () => {
      const result = await execute(/* GraphQL */ `
        mutation {
          createUser(name: "Charlie", email: "charlie@example.com") {
            name
            email
          }
        }
      `)
      assert.strictEqual(result.errors, undefined)
      assert.deepEqual(result.data?.createUser, {
        name: 'Charlie',
        email: 'charlie@example.com',
      })
    })

    it('should validate email format on createUser', async () => {
      const result = await execute(/* GraphQL */ `
        mutation {
          createUser(name: "Bad", email: "not-an-email") {
            id
          }
        }
      `)
      assert.ok(result.errors)
      assert.ok(result.errors[0].message.toLowerCase().includes('email'))
    })

    it('should update a user', async () => {
      const user = USERS[1]
      const result = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            updateUser(id: $id, name: "Updated Bob") {
              id
              name
            }
          }
        `,
        { id: user.id },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.updateUser?.name, 'Updated Bob')
    })

    it('should delete a user (using a newly created one)', async () => {
      const createRes = await execute(/* GraphQL */ `
        mutation {
          createUser(name: "To Be Deleted", email: "delete@example.com") {
            id
          }
        }
      `)
      const newUserId = createRes.data?.createUser?.id

      const deleteRes = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            deleteUser(id: $id) {
              id
            }
          }
        `,
        { id: newUserId },
      )
      assert.strictEqual(deleteRes.errors, undefined)
      assert.strictEqual(deleteRes.data?.deleteUser?.id, newUserId)

      const checkResult = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            user(id: $id) {
              id
            }
          }
        `,
        { id: newUserId },
      )
      assert.ok(checkResult.errors)
    })
  })

  describe('Menu Module', () => {
    it('should return all menu items', async () => {
      const result = await execute(/* GraphQL */ `
        query {
          menu {
            id
            name
            price
            category
          }
        }
      `)
      assert.strictEqual(result.errors, undefined)
      const menu = result.data?.menu.filter((i: any) => initialMenuItemIds.includes(i.id))
      assert.deepEqual(menu, MENU_ITEMS)
    })

    it('should return a menu item by id', async () => {
      const item = MENU_ITEMS[0]
      const result = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            menuItem(id: $id) {
              id
              name
            }
          }
        `,
        { id: item.id },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.menuItem?.name, item.name)
    })

    it('should create a menu item', async () => {
      const result = await execute(/* GraphQL */ `
        mutation {
          createMenuItem(name: "Espresso", price: 2.5, category: COFFEE) {
            name
            price
            category
          }
        }
      `)
      assert.strictEqual(result.errors, undefined)
      assert.deepEqual(result.data?.createMenuItem, {
        name: 'Espresso',
        price: 2.5,
        category: 'COFFEE',
      })
    })

    it('should update a menu item', async () => {
      const item = MENU_ITEMS[1]
      const result = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            updateMenuItem(id: $id, price: 4.0) {
              id
              price
            }
          }
        `,
        { id: item.id },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.updateMenuItem?.price, 4.0)
    })

    it('should delete a menu item', async () => {
      const createRes = await execute(/* GraphQL */ `
        mutation {
          createMenuItem(name: "Temporary", price: 1.0, category: FOOD) {
            id
          }
        }
      `)
      const newItemId = createRes.data?.createMenuItem?.id

      const result = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            deleteMenuItem(id: $id) {
              id
            }
          }
        `,
        { id: newItemId },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.deleteMenuItem?.id, newItemId)
    })
  })

  describe('Order Module', () => {
    it('should return all orders', async () => {
      const result = await execute(/* GraphQL */ `
        query {
          orders {
            id
            status
            createdAt
          }
        }
      `)
      assert.strictEqual(result.errors, undefined)
      assert.ok(Array.isArray(result.data?.orders))
    })

    it('should resolve order user and items (Relational)', async () => {
      const order = ORDERS[0]
      const result = await execute(
        /* GraphQL */ `
          query ($id: Int!) {
            order(id: $id) {
              id
              user {
                id
                name
              }
              items {
                id
                name
              }
            }
          }
        `,
        { id: order.id },
      )
      assert.strictEqual(result.errors, undefined)
      const data = result.data?.order
      assert.ok(data?.user, 'Order user should be resolved')
      assert.strictEqual(data?.user.id, order.userId)
      assert.ok(Array.isArray(data?.items))
      assert.strictEqual(data?.items.length, order.itemIds.length)
    })

    it('should create an order with valid userId and items', async () => {
      const user = USERS[1]
      const item = MENU_ITEMS[0]
      const result = await execute(
        /* GraphQL */ `
          mutation ($userId: Int!, $items: [Int!]!) {
            createOrder(userId: $userId, items: $items) {
              userId
              itemIds
              status
            }
          }
        `,
        { userId: user.id, items: [item.id] },
      )
      assert.strictEqual(result.errors, undefined)
      assert.deepEqual(result.data?.createOrder, {
        userId: user.id,
        itemIds: [item.id],
        status: 'PENDING',
      })
    })

    it('should throw error when userId does not exist (Custom Refine)', async () => {
      const result = await execute(
        /* GraphQL */ `
          mutation {
            createOrder(userId: 9999, items: [1]) {
              id
            }
          }
        `,
        {},
      )
      assert.ok(result.errors, 'Should have errors')
      const errorMsg = result.errors[0].message
      assert.ok(
        errorMsg.includes('User not found'),
        `Error message "${errorMsg}" should include "User not found"`,
      )
    })

    it('should throw error when item does not exist (Custom Refine)', async () => {
      const result = await execute(
        /* GraphQL */ `
          mutation ($userId: Int!) {
            createOrder(userId: $userId, items: [9999]) {
              id
            }
          }
        `,
        { userId: USERS[0].id },
      )
      assert.ok(result.errors, 'Should have errors')
      const errorMsg = result.errors[0].message
      assert.ok(
        errorMsg.includes('Menu item not found'),
        `Error message "${errorMsg}" should include "Menu item not found"`,
      )
    })

    it('should throw error for empty items array (Zod Min)', async () => {
      const result = await execute(
        /* GraphQL */ `
          mutation ($userId: Int!) {
            createOrder(userId: $userId, items: []) {
              id
            }
          }
        `,
        { userId: USERS[0].id },
      )
      assert.ok(result.errors, 'Should have errors')
      const errorMsg = result.errors[0].message
      assert.ok(
        errorMsg.includes('At least one item is required'),
        `Error message "${errorMsg}" should include "At least one item is required"`,
      )
    })

    it('should update order status', async () => {
      const order = ORDERS[0]
      const result = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            updateOrder(id: $id, status: COMPLETED) {
              id
              status
            }
          }
        `,
        { id: order.id },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.updateOrder?.status, 'COMPLETED')
    })

    it('should delete an order', async () => {
      const createRes = await execute(
        /* GraphQL */ `
          mutation ($userId: Int!, $items: [Int!]!) {
            createOrder(userId: $userId, items: $items) {
              id
            }
          }
        `,
        { userId: USERS[0].id, items: [MENU_ITEMS[0].id] },
      )
      assert.ok(createRes.data?.createOrder, 'Order should be created')
      const newOrderId = createRes.data?.createOrder?.id

      const result = await execute(
        /* GraphQL */ `
          mutation ($id: Int!) {
            deleteOrder(id: $id) {
              id
            }
          }
        `,
        { id: newOrderId },
      )
      assert.strictEqual(result.errors, undefined)
      assert.strictEqual(result.data?.deleteOrder?.id, newOrderId)
    })
  })
}
