import { builder } from './builder.ts'
import './schema/user.ts'
import './schema/menu.ts'
import './schema/order.ts'

export const schema = builder.toSchema()
