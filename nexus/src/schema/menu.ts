import {
  objectType,
  extendType,
  intArg,
  stringArg,
  floatArg,
  nonNull,
  enumType,
  interfaceType,
  unionType,
} from 'nexus'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'

export const SugarLevel = enumType({
  name: 'SugarLevel',
  members: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
})

// Interface: Food (公共字段)
export const Food = interfaceType({
  name: 'Food',
  description: 'Food interface with common fields',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.float('price')
  },
  resolveType(item: any) {
    return item?.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})

// Coffee 类型，实现 Food 接口
export const Coffee = objectType({
  name: 'Coffee',
  description: 'Coffee menu item',
  definition(t) {
    t.implements('Food')
    t.nonNull.field('sugarLevel', {
      type: SugarLevel,
    })
    t.nonNull.string('origin')
  },
})

// Dessert 类型，实现 Food 接口
export const Dessert = objectType({
  name: 'Dessert',
  description: 'Dessert menu item',
  definition(t) {
    t.implements('Food')
    t.nonNull.float('calories')
  },
})

// Union 类型: MenuItem = Coffee | Dessert
export const MenuItem = unionType({
  name: 'MenuItem',
  description: 'Menu item union type',
  definition(t) {
    t.members('Coffee', 'Dessert')
  },
  resolveType(item: any) {
    return item?.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})

// In-memory data store
export const menuMap = new Map<
  number,
  | {
      __typename: 'Coffee'
      id: number
      name: string
      price: number
      sugarLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
      origin: string
    }
  | { __typename: 'Dessert'; id: number; name: string; price: number; calories: number }
>(MENU_ITEMS.map((i) => [i.id, i as any]))

export const MenuQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('menu', {
      type: MenuItem,
      resolve() {
        return Array.from(menuMap.values())
      },
    })

    t.field('menuItem', {
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
    t.nonNull.field('createCoffee', {
      type: Coffee,
      args: {
        name: nonNull(stringArg()),
        price: nonNull(floatArg()),
        sugarLevel: nonNull('SugarLevel'),
        origin: nonNull(stringArg()),
      },
      resolve(_parent, { name, price, sugarLevel, origin }) {
        const id = incrementId()
        const newItem = {
          __typename: 'Coffee' as const,
          id,
          name,
          price,
          sugarLevel: sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH',
          origin,
        }
        menuMap.set(id, newItem)
        return newItem
      },
    })

    t.field('updateCoffee', {
      type: Coffee,
      args: {
        id: nonNull(intArg()),
        name: stringArg(),
        price: floatArg(),
        sugarLevel: 'SugarLevel',
        origin: stringArg(),
      },
      resolve(_parent, { id, name, price, sugarLevel, origin }) {
        const item = menuMap.get(id)
        if (!item || item.__typename !== 'Coffee') {
          return null
        }

        if (name != null) {
          item.name = name
        }
        if (price != null) {
          item.price = price
        }
        if (sugarLevel != null) {
          item.sugarLevel = sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
        }
        if (origin != null) {
          item.origin = origin
        }

        return item
      },
    })

    t.nonNull.field('createDessert', {
      type: Dessert,
      args: {
        name: nonNull(stringArg()),
        price: nonNull(floatArg()),
        calories: nonNull(floatArg()),
      },
      resolve(_parent, { name, price, calories }) {
        const id = incrementId()
        const newItem = {
          __typename: 'Dessert' as const,
          id,
          name,
          price,
          calories,
        }
        menuMap.set(id, newItem)
        return newItem
      },
    })

    t.field('updateDessert', {
      type: Dessert,
      args: {
        id: nonNull(intArg()),
        name: stringArg(),
        price: floatArg(),
        calories: floatArg(),
      },
      resolve(_parent, { id, name, price, calories }) {
        const item = menuMap.get(id)
        if (!item || item.__typename !== 'Dessert') {
          return null
        }

        if (name != null) {
          item.name = name
        }
        if (price != null) {
          item.price = price
        }
        if (calories != null) {
          item.calories = calories
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
