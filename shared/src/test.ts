import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { GraphQLSchema } from 'graphql'

export function runTests(schema: GraphQLSchema) {
  describe('schema', () => {
    it('should be defined', () => {
      assert.ok(schema)
    })
  })
}
