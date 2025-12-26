import { Int } from '@getcronit/pylon'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'

export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export interface Food {
  id: Int
  name: string
  price: number
}

export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

export class Dessert implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public calories: number,
  ) {}
}

// Union 类型: MenuItem = Coffee | Dessert
// Pylon 会自动将 TypeScript 联合类型转换为 GraphQL Union 类型
export type MenuItem = Coffee | Dessert

// 类型定义
type CoffeeItem = {
  __typename: 'Coffee'
  id: number
  name: string
  price: number
  sugarLevel: SugarLevel
  origin: string
}

type DessertItem = {
  __typename: 'Dessert'
  id: number
  name: string
  price: number
  calories: number
}

type MenuItemType = CoffeeItem | DessertItem

// In-memory data map
export const menuItemMap = new Map<number, MenuItemType>(
  MENU_ITEMS.map((item) => [item.id, item as MenuItemType]),
)

export const menuQueries = {
  menu: (): MenuItem[] => {
    return Array.from(menuItemMap.values()).map((i) => {
      if (i.__typename === 'Coffee') {
        return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
      } else {
        return new Dessert(i.id, i.name, i.price, i.calories)
      }
    })
  },
  menuItem: (id: Int): MenuItem | undefined => {
    const i = menuItemMap.get(id)
    if (!i) return undefined
    if (i.__typename === 'Coffee') {
      return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
    } else {
      return new Dessert(i.id, i.name, i.price, i.calories)
    }
  },
}

export const menuMutations = {
  createCoffee: (name: string, price: number, sugarLevel: SugarLevel, origin: string): Coffee => {
    const id = incrementId()
    const newItem: CoffeeItem = {
      __typename: 'Coffee',
      id,
      name,
      price,
      sugarLevel,
      origin,
    }
    menuItemMap.set(id, newItem)
    return new Coffee(id, name, price, sugarLevel, origin)
  },

  updateCoffee: (
    id: Int,
    name?: string,
    price?: number,
    sugarLevel?: SugarLevel,
    origin?: string,
  ): Coffee | undefined => {
    const item = menuItemMap.get(id)
    if (!item || item.__typename !== 'Coffee') return undefined
    if (name !== undefined) item.name = name
    if (price !== undefined) item.price = price
    if (sugarLevel !== undefined) item.sugarLevel = sugarLevel
    if (origin !== undefined) item.origin = origin
    return new Coffee(item.id, item.name, item.price, item.sugarLevel, item.origin)
  },

  createDessert: (name: string, price: number, calories: number): Dessert => {
    const id = incrementId()
    const newItem: DessertItem = {
      __typename: 'Dessert',
      id,
      name,
      price,
      calories,
    }
    menuItemMap.set(id, newItem)
    return new Dessert(id, name, price, calories)
  },

  updateDessert: (
    id: Int,
    name?: string,
    price?: number,
    calories?: number,
  ): Dessert | undefined => {
    const item = menuItemMap.get(id)
    if (!item || item.__typename !== 'Dessert') return undefined
    if (name !== undefined) item.name = name
    if (price !== undefined) item.price = price
    if (calories !== undefined) item.calories = calories
    return new Dessert(item.id, item.name, item.price, item.calories)
  },

  deleteMenuItem: (id: Int): MenuItem | undefined => {
    const item = menuItemMap.get(id)
    if (item) {
      menuItemMap.delete(id)
      if (item.__typename === 'Coffee') {
        return new Coffee(item.id, item.name, item.price, item.sugarLevel, item.origin)
      } else {
        return new Dessert(item.id, item.name, item.price, item.calories)
      }
    }
    return undefined
  },
}
