import SchemaBuilder from '@pothos/core'
import ValidationPlugin from '@pothos/plugin-validation'
import DataloaderPlugin from '@pothos/plugin-dataloader'
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import { DateTimeResolver } from 'graphql-scalars'
import { GraphQLError } from 'graphql'

export interface Context {
  // Add context properties here if needed
}

export interface SchemaTypes {
  Scalars: {
    DateTime: {
      Input: Date
      Output: Date
    }
  }
  Context: Context
  DefaultFieldNullability: false
}

const builder = new SchemaBuilder<SchemaTypes>({
  plugins: [ValidationPlugin, DataloaderPlugin, SimpleObjectsPlugin],
  defaultFieldNullability: false,
  validation: {
    validationError: (validationResult) => {
      const message = validationResult.issues?.[0]?.message || 'Validation failed'
      return new GraphQLError(message)
    },
  },
})

builder.addScalarType('DateTime', DateTimeResolver, {})

builder.queryType({})
builder.mutationType({})

export type InferPothosObject<T> =
  T extends PothosSchemaTypes.ObjectRef<any, infer Shape> ? Shape : never

export { builder }
