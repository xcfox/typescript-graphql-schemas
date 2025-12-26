import { GarphSchema } from 'garph'
import { GraphQLDateTime } from 'graphql-scalars'

export const g = new GarphSchema()

export const DateTime = g.scalarType<Date, string>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(userDate(value)),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})

function userDate(value: any): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return value
}

