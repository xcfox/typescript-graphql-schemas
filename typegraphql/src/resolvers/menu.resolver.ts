import 'reflect-metadata'
import { Resolver, Query, Mutation, Arg, Int, Float } from 'type-graphql'
import { GraphQLError } from 'graphql'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { MenuItem, Coffee, Dessert, SugarLevel } from './menu.type.ts'

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

export const menuMap = new Map<number, MenuItemType>(
  MENU_ITEMS.map((i) => [i.id, i as MenuItemType]),
)

@Resolver()
export class MenuResolver {
  @Query(() => [MenuItem])
  menu(): MenuItemType[] {
    return Array.from(menuMap.values())
  }

  @Query(() => MenuItem)
  menuItem(@Arg('id', () => Int) id: number): MenuItemType {
    const item = menuMap.get(id)
    if (!item) throw new GraphQLError('Menu item not found')
    return item
  }

  @Mutation(() => Coffee)
  createCoffee(
    @Arg('name', () => String) name: string,
    @Arg('price', () => Float) price: number,
    @Arg('sugarLevel', () => SugarLevel) sugarLevel: SugarLevel,
    @Arg('origin', () => String) origin: string,
  ): CoffeeItem {
    const id = incrementId()
    const newItem: CoffeeItem = {
      __typename: 'Coffee',
      id,
      name,
      price,
      sugarLevel,
      origin,
    }
    menuMap.set(id, newItem)
    return newItem
  }

  @Mutation(() => Coffee)
  updateCoffee(
    @Arg('id', () => Int) id: number,
    @Arg('name', () => String, { nullable: true }) name?: string,
    @Arg('price', () => Float, { nullable: true }) price?: number,
    @Arg('sugarLevel', () => SugarLevel, { nullable: true }) sugarLevel?: SugarLevel,
    @Arg('origin', () => String, { nullable: true }) origin?: string,
  ): CoffeeItem {
    const item = menuMap.get(id)
    if (!item || item.__typename !== 'Coffee') {
      throw new GraphQLError('Coffee not found')
    }
    if (name != null) item.name = name
    if (price != null) item.price = price
    if (sugarLevel != null) item.sugarLevel = sugarLevel
    if (origin != null) item.origin = origin
    return item
  }

  @Mutation(() => Dessert)
  createDessert(
    @Arg('name', () => String) name: string,
    @Arg('price', () => Float) price: number,
    @Arg('calories', () => Float) calories: number,
  ): DessertItem {
    const id = incrementId()
    const newItem: DessertItem = {
      __typename: 'Dessert',
      id,
      name,
      price,
      calories,
    }
    menuMap.set(id, newItem)
    return newItem
  }

  @Mutation(() => Dessert)
  updateDessert(
    @Arg('id', () => Int) id: number,
    @Arg('name', () => String, { nullable: true }) name?: string,
    @Arg('price', () => Float, { nullable: true }) price?: number,
    @Arg('calories', () => Float, { nullable: true }) calories?: number,
  ): DessertItem {
    const item = menuMap.get(id)
    if (!item || item.__typename !== 'Dessert') {
      throw new GraphQLError('Dessert not found')
    }
    if (name != null) item.name = name
    if (price != null) item.price = price
    if (calories != null) item.calories = calories
    return item
  }

  @Mutation(() => MenuItem, { nullable: true })
  deleteMenuItem(@Arg('id', () => Int) id: number): MenuItemType | null {
    const item = menuMap.get(id)
    if (item) menuMap.delete(id)
    return item || null
  }
}
