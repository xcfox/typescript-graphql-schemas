import { GraphQLError } from 'graphql'
import { z } from 'zod'

/**
 * Validates a value against a Zod schema and returns the parsed value.
 * Throws a GraphQLError if validation fails.
 */
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issues = result.error.issues || []
    const firstError = issues[0]
    const errorMessage = firstError?.message || 'Validation failed'
    throw new GraphQLError(errorMessage)
  }
  return result.data
}

