import { objectType, extendType, intArg, stringArg, floatArg, nonNull, enumType } from 'nexus'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'

export const MenuCategory = enumType({
  name: 'MenuCategory',
  members: ['COFFEE', 'FOOD'],
})

export const MenuItem = objectType({
  name: 'MenuItem',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.float('price')
    t.nonNull.field('category', {
      type: MenuCategory,
    })
  },
})

// In-memory data store
export const menuMap = new Map<
  number,
  { id: number; name: string; price: number; category: 'COFFEE' | 'FOOD' }
>(MENU_ITEMS.map((i) => [i.id, { ...i }]))

export const MenuQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('menu', {
      type: MenuItem,
      resolve() {
        return Array.from(menuMap.values())
      },
    })

    t.nonNull.field('menuItem', {
      type: MenuItem,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const item = menuMap.get(id)
        if (!item) {
          throw new GraphQLError('Menu item not found')
        }
        return item
      },
    })
  },
})

export const MenuMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createMenuItem', {
      type: MenuItem,
      args: {
        name: nonNull(stringArg()),
        price: nonNull(floatArg()),
        category: nonNull('MenuCategory'),
      },
      resolve(_parent, { name, price, category }) {
        const id = incrementId()
        const newItem = { id, name, price, category: category as 'COFFEE' | 'FOOD' }
        menuMap.set(id, newItem)
        return newItem
      },
    })

    t.nonNull.field('updateMenuItem', {
      type: MenuItem,
      args: {
        id: nonNull(intArg()),
        name: stringArg(),
        price: floatArg(),
        category: 'MenuCategory',
      },
      resolve(_parent, { id, name, price, category }) {
        const item = menuMap.get(id)
        if (!item) {
          throw new GraphQLError('Menu item not found')
        }

        if (name != null) {
          item.name = name
        }
        if (price != null) {
          item.price = price
        }
        if (category != null) {
          item.category = category as 'COFFEE' | 'FOOD'
        }

        return item
      },
    })

    t.field('deleteMenuItem', {
      type: MenuItem,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const item = menuMap.get(id)
        if (item) {
          menuMap.delete(id)
        }
        return item || null
      },
    })
  },
})
