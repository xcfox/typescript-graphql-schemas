import { Field, ObjectType, registerEnumType, Int, Float } from 'type-graphql'

export enum MenuCategory {
  COFFEE = 'COFFEE',
  FOOD = 'FOOD',
}

registerEnumType(MenuCategory, {
  name: 'MenuCategory',
})

@ObjectType()
export class MenuItem {
  @Field(() => Int)
  id!: number

  @Field(() => String)
  name!: string

  @Field(() => Float)
  price!: number

  @Field(() => MenuCategory)
  category!: MenuCategory
}

