import type { Int, Float } from 'grats'

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
