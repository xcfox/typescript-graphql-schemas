import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import type { Int, Float } from 'grats'

/**
 * Sugar level for coffee
 * @gqlEnum
 */
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Food interface with common fields
 * @gqlInterface
 */
export interface Food {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
}

/**
 * Coffee menu item
 * @gqlType
 */
export class Coffee implements Food {
  __typename = 'Coffee' as const
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  sugarLevel: SugarLevel
  /** @gqlField */
  origin: string

  constructor(id: Int, name: string, price: Float, sugarLevel: SugarLevel, origin: string) {
    this.id = id
    this.name = name
    this.price = price
    this.sugarLevel = sugarLevel
    this.origin = origin
  }
}

/**
 * Dessert menu item
 * @gqlType
 */
export class Dessert implements Food {
  __typename = 'Dessert' as const
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  calories: Float

  constructor(id: Int, name: string, price: Float, calories: Float) {
    this.id = id
    this.name = name
    this.price = price
    this.calories = calories
  }
}

/**
 * Menu item union type
 * @gqlUnion
 */
export type MenuItem = Coffee | Dessert

export const menuMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => {
    if (item.__typename === 'Coffee') {
      return [item.id, new Coffee(item.id, item.name, item.price, item.sugarLevel, item.origin)]
    } else {
      return [item.id, new Dessert(item.id, item.name, item.price, item.calories)]
    }
  }),
)

/** @gqlQueryField */
export function menu(): MenuItem[] {
  return Array.from(menuMap.values())
}

/** @gqlQueryField */
export function menuItem(id: Int): MenuItem | null {
  const item = menuMap.get(id)
  if (!item) throw new GraphQLError('Menu item not found')
  return item
}

/** @gqlMutationField */
export function createCoffee(
  name: string,
  price: Float,
  sugarLevel: SugarLevel,
  origin: string,
): Coffee {
  const id = incrementId()
  const newItem = new Coffee(id, name, price, sugarLevel, origin)
  menuMap.set(id, newItem)
  return newItem
}

/** @gqlMutationField */
export function updateCoffee(
  id: Int,
  name?: string | null,
  price?: Float | null,
  sugarLevel?: SugarLevel | null,
  origin?: string | null,
): Coffee | null {
  const item = menuMap.get(id)
  if (!item || item.__typename !== 'Coffee') return null
  if (name != null) item.name = name
  if (price != null) item.price = price
  if (sugarLevel != null) item.sugarLevel = sugarLevel
  if (origin != null) item.origin = origin
  return item
}

/** @gqlMutationField */
export function createDessert(name: string, price: Float, calories: Float): Dessert {
  const id = incrementId()
  const newItem = new Dessert(id, name, price, calories)
  menuMap.set(id, newItem)
  return newItem
}

/** @gqlMutationField */
export function updateDessert(
  id: Int,
  name?: string | null,
  price?: Float | null,
  calories?: Float | null,
): Dessert | null {
  const item = menuMap.get(id)
  if (!item || item.__typename !== 'Dessert') return null
  if (name != null) item.name = name
  if (price != null) item.price = price
  if (calories != null) item.calories = calories
  return item
}

/** @gqlMutationField */
export function deleteMenuItem(id: Int): MenuItem | null {
  const item = menuMap.get(id)
  if (item) menuMap.delete(id)
  return item || null
}
