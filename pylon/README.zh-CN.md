# Pylon 评估报告

本报告基于对 Pylon 实际业务代码和源码的深入调研，从 5 个核心技术维度进行全面评估。

---

## 1. 架构模式

### 1.1 架构模式类型

Pylon 采用 **Inference（自动推断）模式**，通过 TypeScript Compiler API 在构建时分析类型定义，自动生成 GraphQL Schema。

从业务代码可以看出，Pylon 的核心是直接使用 TypeScript 类和类型定义，无需显式的 Schema 构建代码：

```ts
// src/resolvers/user.ts
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}
}

export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}
```

### 1.2 Schema 构建过程

Pylon 的 Schema 构建分为两个阶段：

1. **构建时分析**：`pylon-builder` 使用 TypeScript Compiler API 分析类型定义
2. **运行时执行**：生成的 Schema 和 Resolver 在运行时被 GraphQL Yoga 使用

#### 构建时分析

从 `packages/pylon-builder/src/schema/builder.ts` 可以看出，构建过程如下：

```ts
export class SchemaBuilder {
  public build() {
    // 1. 加载 TypeScript 程序
    this.program = ts.createProgram(filesInSfiDir, tsConfigOptions)
    this.checker = this.program.getTypeChecker()
    
    // 2. 查找 graphql 导出
    const sfiFileDefaultExport = sfiFileExports.find(
      exportSymbol => exportSymbol.escapedName === 'graphql'
    )
    
    // 3. 解析 Query、Mutation、Subscription 类型
    const queryType = queryProperty
      ? this.checker.getTypeOfSymbolAtLocation(queryProperty, this.sfiFile)
      : undefined
    
    // 4. 使用 SchemaParser 解析类型定义
    const parser = new SchemaParser(this.checker, this.sfiFile, this.program)
    parser.parse({
      Query: queryType,
      Mutation: mutationType,
      Subscription: subscriptionType
    })
    
    return {
      typeDefs: parser.toString(),      // GraphQL SDL 字符串
      schema: parser.getSchema(),        // Schema 对象
      resolvers: parser.getResolvers()  // Union/Interface 的 __resolveType
    }
  }
}
```

#### 代码生成

从 `packages/pylon-builder/src/bundler/bundler.ts` 可以看出，构建过程会：

1. **生成 GraphQL Schema 文件**：`.pylon/schema.graphql`
2. **生成 Resolver 文件**：`.pylon/resolvers.js`（包含 Union/Interface 的 `__resolveType`）
3. **打包业务代码**：使用 esbuild 将 `src/index.ts` 打包为 `.pylon/index.js`，并注入 Schema 和 Resolver

```ts
// bundler.ts 中的注入逻辑
const injectCodePlugin: Plugin = {
  name: 'inject-code',
  setup(build) {
    build.onLoad({filter: /src[\/\\]index\.ts$/}, async (args) => {
      const contents = await fs.promises.readFile(args.path, 'utf-8')
      
      return {
        loader: 'ts',
        contents: contents + `
import {handler as __internalPylonHandler} from "@getcronit/pylon"

app.use(__internalPylonHandler({
  typeDefs: ${JSON.stringify(typeDefs)},
  graphql,
  resolvers: ${preparedResolvers},
  config: __internalPylonConfig
}))
`
      }
    })
  }
}
```

#### 运行时执行

从 `packages/pylon/src/app/handler/pylon-handler.ts` 可以看出，运行时使用 GraphQL Yoga：

```ts
export const handler = (options: PylonHandlerOptions) => {
  // 读取生成的 Schema
  const typeDefs = readFileSync(path.join(process.cwd(), '.pylon', 'schema.graphql'), 'utf-8')
  const resolvers = require(path.join(process.cwd(), '.pylon', 'resolvers.js')).resolvers
  
  // 将业务代码中的 graphql 对象转换为 GraphQL Resolvers
  const graphqlResolvers = resolversToGraphQLResolvers(graphql)
  
  // 创建 GraphQL Schema
  const schema = createSchema<Context>({
    typeDefs,
    resolvers: {
      ...graphqlResolvers,
      ...resolvers,
      // 内置标量类型
      Date: DateTimeISOResolver,
      JSON: JSONResolver,
      Object: JSONObjectResolver,
      Void: GraphQLVoid,
      Number: new GraphQLScalarType({...})
    }
  })
  
  // 创建 GraphQL Yoga 实例
  const yoga = createYoga({
    schema,
    plugins: [...]
  })
  
  return async (c: Context) => {
    return await yoga.fetch(c.req.raw, c.env, executionContext)
  }
}
```

### 1.3 依赖复杂度

**核心依赖**：根据 `packages/pylon/package.json`，核心包依赖：

```json
{
  "dependencies": {
    "@envelop/core": "^5.0.3",
    "@envelop/disable-introspection": "^8.0.0",
    "@getcronit/pylon-telemetry": "workspace:^",
    "@hono/sentry": "^1.2.0",
    "@sentry/bun": "^8.17.0",
    "@sentry/node": "^8.54.0",
    "consola": "^3.2.3",
    "graphql": "^16.9.0",
    "graphql-scalars": "^1.24.0",
    "graphql-yoga": "^5.6.2",
    "hono": "^4.0.8",
    "jsonwebtoken": "^9.0.2",
    "openid-client": "^5.6.4",
    "toucan-js": "^4.1.0",
    "winston": "^3.8.2"
  }
}
```

**构建工具依赖**：`packages/pylon-builder/package.json`：

```json
{
  "dependencies": {
    "chokidar": "^3.5.3",
    "consola": "^3.2.3",
    "esbuild": "^0.23.1",
    "esbuild-plugin-tsc": "^0.4.0",
    "source-map-support": "^0.5.21",
    "typescript": "^5.0.0"
  }
}
```

**业务代码依赖**：从 `typescript-graphql-schemas/pylon/package.json` 可以看出：

```json
{
  "dependencies": {
    "@getcronit/pylon": "^2.4.2",
    "@hono/node-server": "^1.13.7",
    "dataloader": "^2.2.3",
    "graphql": "^16.12.0"
  },
  "devDependencies": {
    "@getcronit/pylon-dev": "^1.0.0"
  }
}
```

**依赖评估**：

1. **需要构建步骤**：必须运行 `pylon build` 或 `pylon dev` 来生成 Schema
2. **需要 TypeScript**：构建过程依赖 TypeScript Compiler API
3. **运行时依赖较多**：核心包引入了 GraphQL Yoga、Hono、Sentry 等多个依赖
4. **不是安装即用**：需要先构建才能运行，开发时需要运行 `pylon dev`

### 1.4 架构模式评估

**优势**：

1. **零配置类型推断**：直接使用 TypeScript 类型，无需额外的 Schema 定义代码
2. **单一数据源**：TypeScript 类型定义是唯一的真实来源，避免类型不同步
3. **开发体验好**：修改类型定义后自动重新构建，支持热重载
4. **类型安全**：充分利用 TypeScript 类型系统，编译时就能发现类型错误

**劣势**：

1. **需要构建步骤**：必须运行构建命令才能生成 Schema，不是纯运行时方案
2. **构建时间**：大型项目可能需要较长的构建时间
3. **依赖复杂度较高**：核心包引入了较多运行时依赖（GraphQL Yoga、Hono、Sentry 等）
4. **调试困难**：构建过程是黑盒，出现问题时难以调试
5. **不够灵活**：某些高级 GraphQL 特性（如 Directives）可能难以通过类型推断实现

**总结**：Pylon 的 Inference 架构模式在提供零配置类型推断的同时，需要构建步骤和较多的运行时依赖。对于追求开发效率和类型安全的项目来说，这是一个**不错的选择**，但需要接受构建步骤和依赖复杂度的权衡。

---

## 2. 类型定义

### 2.1 对象类型（ObjectType）

Pylon 通过 TypeScript 类或接口定义对象类型，构建时自动推断为 GraphQL ObjectType。

#### 方式 1：使用类定义

从业务代码 `src/resolvers/user.ts` 可以看出：

```ts
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}
  
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**特点**：
- 类的公共属性自动映射为 GraphQL 字段
- 类的方法可以作为字段 resolver（返回 Promise 的方法会被识别为异步字段）
- 支持关联查询（如 `User.orders`）

#### 方式 2：使用接口定义

从业务代码 `src/resolvers/menu.ts` 可以看出：

```ts
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
```

**特点**：
- 接口会被识别为 GraphQL Interface
- 实现接口的类会自动继承接口的字段
- 支持多接口实现

### 2.2 联合类型（Union）

Pylon 支持 TypeScript 联合类型，自动转换为 GraphQL Union 类型。

从业务代码 `src/resolvers/menu.ts` 可以看出：

```ts
export type MenuItem = Coffee | Dessert
```

**特点**：
- 直接使用 TypeScript 联合类型语法
- 构建时会自动生成 Union 类型定义
- 自动生成 `__resolveType` 函数（基于字段存在性检查）

从源码 `packages/pylon-builder/src/schema/schema-parser.ts` 可以看出，Union 的 `__resolveType` 生成逻辑：

```ts
private getResolveTypeForUnionOrInterface(entity: Union | Interface, types: Array<Type>) {
  const entityTypes = 'types' in entity
    ? types.filter(t => entity.types.includes(t.name))
    : types.filter(t => t.implements?.includes(entity.name))
  
  // 按字段数量排序，优先匹配字段更多的类型
  entityTypes.sort((a, b) => b.fields.length - a.fields.length)
  
  // 生成字段检查代码
  const checks = entityTypes.map(type => {
    const fieldChecks = type.fields
      .map(field => `"${field.name}" in node`)
      .join(' && ')
    return `if (${fieldChecks}) {return '${type.name}'};`
  })
  
  return new Function('return ' + `function resolveType(node) { if (node && typeof node === 'object') { ${checks.join(' ')} } }`)()
}
```

**限制**：
- Union 类型在输入字段中不支持（GraphQL 规范限制）
- 如果 Union 中的类型有相同字段，可能出现类型解析歧义

### 2.3 接口（Interface）

Pylon 支持 TypeScript 接口，自动转换为 GraphQL Interface。

从业务代码和示例代码可以看出：

```ts
// 方式 1：类实现接口
export interface Food {
  id: Int
  name: string
  price: number
}

export class Coffee implements Food {
  // ...
}

// 方式 2：Union 自动转换为 Interface（如果有公共字段）
type Ship = {
  id: ID
  name: string
  speed: number
  length: number
}

type Plane = {
  id: ID
  name: string
  speed: number
  altitude: number
}

type Vehicle = Ship | Plane  // 会自动转换为 Interface，因为 Ship 和 Plane 有公共字段
```

从源码可以看出，如果 Union 类型的所有成员都有公共字段，会自动转换为 Interface：

```ts
private checkIfInterfaceIsPossibleForUnion(union: Union, types: Array<Type>): Interface | null {
  const unionTypes = union.types.map(t => types.find(type => type.name === t))
  const baseType = unionTypes[0]
  
  // 检查所有类型的公共字段
  const commonFields = baseType.fields.filter(field => {
    return unionTypes.every(type => {
      return type.fields.some(f => JSON.stringify(f) === JSON.stringify(field))
    })
  })
  
  if (commonFields.length > 0) {
    return {
      name: union.name,
      description: union.description,
      fields: commonFields
    }
  }
  
  return null
}
```

### 2.4 枚举类型（Enum）

Pylon 支持 TypeScript 字符串字面量联合类型，自动转换为 GraphQL Enum。

从业务代码 `src/resolvers/order.ts` 可以看出：

```ts
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

从业务代码 `src/resolvers/menu.ts` 可以看出：

```ts
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
```

**特点**：
- 直接使用 TypeScript 字符串字面量联合类型
- 构建时自动识别并转换为 GraphQL Enum
- 无需手动注册或重复定义

从源码 `packages/pylon-builder/src/schema/type-definition-builder.ts` 可以看出枚举识别逻辑：

```ts
if (isPrimitiveUnion(type)) {
  const types = (type as ts.UnionType).types
  
  // 枚举所有成员
  const members = types.map((t: ts.Type) => {
    if (t.isLiteral()) {
      const name = t.value?.toString()
      if (!name) {
        throw new Error('Enum member name is undefined')
      }
      return safeTypeName(name)
    }
    throw new Error('Invalid type for enum member')
  })
  
  if (members.length > 0) {
    this.enums.push({
      name: typeName,
      values: members,
      rawType: type
    })
  }
}
```

**限制**：
- 只支持字符串字面量联合类型，不支持数字字面量
- 不支持 TypeScript `enum` 关键字（需要使用 `as const` 对象或字符串字面量联合）

### 2.5 类型定义评估

**优势**：

1. **单一数据源**：TypeScript 类型定义是唯一的真实来源，避免类型不同步
2. **零配置**：直接使用 TypeScript 语法，无需额外的 Schema 定义代码
3. **自动推断**：Union、Interface、Enum 都能自动识别和转换
4. **类型安全**：充分利用 TypeScript 类型系统，编译时类型检查

**劣势**：

1. **灵活性有限**：某些高级特性（如字段描述、废弃标记）需要通过 JSDoc 注释，不够直观
2. **Union 限制**：Union 类型在输入字段中不支持（GraphQL 规范限制）
3. **类型解析歧义**：如果 Union 中的类型有相同字段，可能出现类型解析歧义
4. **调试困难**：类型推断过程是黑盒，出现问题时难以调试

**总结**：Pylon 的类型定义方式非常直观，充分利用了 TypeScript 的类型系统。对于追求开发效率和类型安全的项目来说，这是一个**优秀的选择**，但需要接受一些灵活性上的权衡。

---

## 3. 解析器定义与输入验证

### 3.1 解析器定义

Pylon 支持三种类型的解析器：Query、Mutation 和 Field Resolver。

#### Query 和 Mutation Resolver

从业务代码可以看出，Query 和 Mutation 定义在 `graphql` 对象中：

```ts
// src/index.ts
export const graphql = {
  Query: {
    ...userQueries,
    ...menuQueries,
    ...orderQueries,
  },
  Mutation: {
    ...userMutations,
    ...menuMutations,
    ...orderMutations,
  },
}
```

Resolver 函数直接使用 TypeScript 函数定义，参数类型自动推断：

```ts
// src/resolvers/user.ts
export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}
```

**特点**：
- 函数参数自动映射为 GraphQL Arguments
- 参数类型自动推断（通过 TypeScript Compiler API）
- 支持可选参数（通过 `?` 标记）
- 支持数组参数（通过 `Int[]` 类型）

#### Field Resolver

从业务代码可以看出，Field Resolver 通过类方法定义：

```ts
// src/resolvers/user.ts
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}
  
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**特点**：
- 类方法自动识别为 Field Resolver
- 支持异步方法（返回 `Promise`）
- 可以通过 `getContext()` 获取上下文信息
- 支持关联查询（如 `User.orders`）

#### 参数定义

从源码 `packages/pylon-builder/src/schema/schema-parser.ts` 可以看出，参数定义支持：

1. **命名元组参数**（推荐方式）：

```ts
// 使用命名元组定义参数
createUser: (args: [name: string, email: string]): User => {
  // ...
}
```

2. **普通函数参数**：

```ts
// 使用普通函数参数
createUser: (name: string, email: string): User => {
  // ...
}
```

从源码可以看出，构建时会从 GraphQL Schema 中提取参数定义，然后按顺序传递给 Resolver 函数：

```ts
// define-pylon.ts 中的参数处理逻辑
const fieldArguments = field?.args || []

const preparedArguments = fieldArguments.reduce(
  (acc: {[x: string]: undefined}, arg: {name: string | number}) => {
    if (args[arg.name] !== undefined) {
      acc[arg.name] = args[arg.name]
    } else {
      acc[arg.name] = undefined
    }
    return acc
  },
  {} as Record<string, any>
)

const orderedArgs = Object.keys(preparedArguments).map(key => preparedArguments[key])
const res = await wrappedFn(...orderedArgs)
```

**限制**：
- 参数顺序必须与 GraphQL Schema 中的定义一致
- 不支持 rest 参数（除非使用命名元组）
- 可选参数必须使用 `?` 标记

### 3.2 参数类型推导

Pylon 通过 TypeScript Compiler API 自动推断参数类型，无需手动定义。

从源码可以看出，类型推断过程：

1. **分析函数签名**：从 TypeScript 类型系统中提取函数参数类型
2. **转换为 GraphQL 类型**：将 TypeScript 类型转换为 GraphQL 类型定义
3. **生成 Schema**：将类型定义写入 GraphQL Schema

**特点**：
- ✅ **完整的类型推导**：参数类型完全自动推断
- ✅ **类型安全**：编译时就能发现类型错误
- ✅ **IDE 支持**：IDE 能提供完整的类型提示

**限制**：
- ⚠️ **构建时推断**：类型推断发生在构建时，不是运行时
- ⚠️ **调试困难**：类型推断过程是黑盒，出现问题时难以调试

### 3.3 格式验证

Pylon 提供了 `createDecorator` API 来实现格式验证，但**不是内置的验证功能**，需要手动编写验证逻辑。

从业务代码 `src/resolvers/user.ts` 可以看出：

```ts
import { createDecorator, ServiceError } from '@getcronit/pylon'

// 定义验证装饰器
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// 使用验证装饰器
export const userMutations = {
  createUser: validateEmail((name: string, email: string): User => {
    const id = incrementId()
    const newUser = { id, name, email }
    userMap.set(id, newUser)
    return new User(id, name, email)
  }),
}
```

从源码 `packages/pylon/src/create-decorator.ts` 可以看出，`createDecorator` 的实现：

```ts
export function createDecorator(callback: (...args: any[]) => Promise<void>) {
  function MyDecorator<T>(fn: T): T {
    const originalFunction = arg1 as T
    
    return async function (...args: Parameters<any>): Promise<ReturnType<any>> {
      await callback(...args)  // 先执行验证
      return (originalFunction as any)(...args)  // 再执行原函数
    } as T
  }
  
  return MyDecorator
}
```

**验证特点**：
- ❌ **无内置验证**：不提供声明式验证 API（如 `.refine()`, `.validate()`）
- ✅ **支持自定义装饰器**：可以通过 `createDecorator` 实现格式验证
- ⚠️ **验证逻辑分散**：格式验证需要在每个 Resolver 中手动编写
- ⚠️ **验证与 Schema 分离**：验证逻辑不在 Schema 定义中，而是在 Resolver 装饰器中

### 3.4 自定义验证（业务逻辑验证）

Pylon 支持通过 `createDecorator` 实现业务逻辑验证，但**不是 Schema 级别的验证功能**。

从业务代码 `src/resolvers/order.ts` 可以看出：

```ts
const validateCreateOrder = createDecorator(async (userId: Int, items: Int[]) => {
  // 1. 验证数组非空
  if (items.length === 0) {
    throw new ServiceError('At least one item is required', {
      code: 'INVALID_ORDER',
      statusCode: 400,
    })
  }
  
  // 2. 验证用户是否存在
  if (!userMap.has(userId)) {
    throw new ServiceError('User not found', {
      code: 'USER_NOT_FOUND',
      statusCode: 400,
    })
  }
  
  // 3. 验证所有菜单项是否存在
  for (const itemId of items) {
    if (!menuItemMap.has(itemId)) {
      throw new ServiceError('Menu item not found', {
        code: 'MENU_ITEM_NOT_FOUND',
        statusCode: 400,
      })
    }
  }
})

export const orderMutations = {
  createOrder: validateCreateOrder((userId: Int, items: Int[]): Order => {
    // 业务逻辑
  }),
}
```

**验证特点**：
- ✅ **支持自定义验证**：可以通过 `createDecorator` 实现业务逻辑验证
- ✅ **错误处理**：使用 `ServiceError` 提供结构化的错误信息
- ⚠️ **验证逻辑重复**：需要在每个 Resolver 中手动编写验证代码
- ⚠️ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式
- ⚠️ **验证与业务逻辑分离**：验证逻辑在装饰器中，业务逻辑在 Resolver 中，但两者需要手动组合

### 3.5 解析器定义与输入验证评估

**优点**：

1. **直观的 Resolver 定义**：直接使用 TypeScript 函数，无需额外的 API
2. **完整的类型推导**：参数类型完全自动推断，类型安全
3. **支持自定义装饰器**：可以通过 `createDecorator` 实现验证逻辑
4. **模块化组织**：支持将 Query、Mutation 和 Field Resolver 拆分到不同文件

**缺点**：

1. **无内置验证功能**：不提供声明式验证 API，格式验证和业务逻辑验证都需要手动编写
2. **验证逻辑分散**：验证代码分散在各个装饰器中，难以复用和组合
3. **验证与 Schema 分离**：验证逻辑不在 Schema 定义中，而是在 Resolver 装饰器中
4. **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式

**总结**：Pylon 的解析器定义非常直观，充分利用了 TypeScript 的类型系统。但验证功能相对薄弱，需要手动编写验证逻辑。对于追求开发效率和类型安全的项目来说，这是一个**不错的选择**，但需要接受验证功能上的权衡。

---

## 4. 内置功能

### 4.1 Directives（指令）

**支持情况**：⚠️ **有限支持**

Pylon **不提供声明式的 Directives 定义 API**，但可以通过 GraphQL Yoga 的插件系统使用 Directives。

从源码可以看出，Pylon 使用 GraphQL Yoga，支持标准的 GraphQL Directives，但需要在构建时手动添加到 Schema 中。

**Federation 支持**：
- ⚠️ **无官方 Federation 支持**：Pylon 本身不提供 Apollo Federation 的官方支持
- ⚠️ **需要手动配置**：如果需要 Federation，需要手动添加 Federation Directives（如 `@key`, `@external` 等）

### 4.2 Extensions（扩展）

**支持情况**：⚠️ **有限支持**

Pylon 生成的 Schema 是标准的 GraphQL Schema，可以通过 GraphQL.js 的 Extensions API 使用，但 Pylon 本身不提供声明式的 Extensions 定义方式。

**使用方式**：
- 需要在生成的 Schema 基础上手动添加 Extensions
- 或者通过 GraphQL Yoga 的插件系统实现类似功能

### 4.3 批量加载（Batching / DataLoader）

**支持情况**：✅ **支持，但需要手动实现**

Pylon **不提供内置的 DataLoader 支持**，但可以通过在 Context 中集成 DataLoader 来实现批量加载。

从业务代码 `src/loaders.ts` 可以看出：

```ts
import DataLoader from 'dataloader'
import { createLoaders } from './loaders.ts'

// 在 Context 中创建 DataLoader
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      // 批量加载逻辑
      const allOrders = Array.from(orderMap.values())
      const orderGroups = new Map<number, Order[]>()
      
      for (const o of allOrders) {
        const orders = orderGroups.get(o.userId) ?? []
        orders.push(new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt))
        orderGroups.set(o.userId, orders)
      }
      
      return userIds.map((id) => orderGroups.get(id) ?? [])
    }),
    
    users: new DataLoader<number, User>(async (userIds) => {
      return userIds.map((id) => {
        const u = userMap.get(id)
        if (!u) {
          return new Error('User not found')
        }
        return new User(u.id, u.name, u.email)
      })
    }),
    
    menuItems: new DataLoader<number, MenuItem>(async (itemIds) => {
      return itemIds.map((id) => {
        const i = menuItemMap.get(id)
        if (!i) {
          return new Error('Menu item not found')
        }
        if (i.__typename === 'Coffee') {
          return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
        } else {
          return new Dessert(i.id, i.name, i.price, i.calories)
        }
      })
    }),
  }
}
```

**在 Resolver 中使用**：

```ts
// src/resolvers/user.ts
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**特点**：
- ❌ **无内置 DataLoader**：不提供类似 `dataloader` 的批量加载和缓存机制
- ✅ **可以通过 Context 实现**：在 Context 中集成 DataLoader 是可行的方案
- ⚠️ **需要手动实现**：批量加载逻辑需要开发者手动实现，无法自动解决 N+1 查询问题
- ⚠️ **无路径感知缓存**：无法自动实现基于 GraphQL 查询路径的缓存

### 4.4 自定义标量（Scalars）

**支持情况**：✅ **完整支持**

Pylon 内置了常用的标量类型，并支持自定义标量。

从源码 `packages/pylon/src/app/handler/pylon-handler.ts` 可以看出，内置标量：

```ts
const schema = createSchema<Context>({
  typeDefs,
  resolvers: {
    ...graphqlResolvers,
    ...resolvers,
    // 内置标量类型
    Date: DateTimeISOResolver,
    JSON: JSONResolver,
    Object: JSONObjectResolver,
    Void: GraphQLVoid,
    Number: new GraphQLScalarType({
      name: 'Number',
      description: 'Custom scalar that handles both integers and floats',
      parseValue(value) {
        if (typeof value !== 'number') {
          throw new TypeError(`Value is not a number: ${value}`)
        }
        return value
      },
      parseLiteral(ast) {
        if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
          return parseFloat(ast.value)
        }
        throw new TypeError(`Value is not a valid number or float: ${ast.value}`)
      },
      serialize(value) {
        if (typeof value !== 'number') {
          throw new TypeError(`Value is not a number: ${value}`)
        }
        return value
      }
    })
  }
})
```

**特点**：
- ✅ **内置常用标量**：`Date`、`JSON`、`Object`、`Void`、`Number`
- ✅ **支持自定义标量**：可以通过 GraphQL Yoga 的插件系统添加自定义标量
- ✅ **集成 graphql-scalars**：可以轻松集成 `graphql-scalars` 库的标量类型

### 4.5 订阅（Subscription）

**支持情况**：✅ **完整支持**

Pylon 支持 GraphQL Subscription，通过 `graphql.Subscription` 对象定义。

从示例代码 `examples/nodejs-subscriptions/src/index.ts` 可以看出：

```ts
import { experimentalCreatePubSub } from '@getcronit/pylon'

enum Events {
  postCreated = 'postCreated'
}

const pubSub = experimentalCreatePubSub<{
  [Events.postCreated]: [post: Post]
}>()

export const graphql = {
  Query: {
    posts
  },
  Mutation: {
    createPost: Post.create
  },
  Subscription: {
    postCreated: () => pubSub.subscribe(Events.postCreated)
  }
}
```

**特点**：
- ✅ **完整支持**：支持 GraphQL Subscription 的完整功能
- ✅ **PubSub 支持**：提供 `experimentalCreatePubSub` API（基于 graphql-yoga）
- ✅ **类型安全**：订阅字段的参数和返回值类型完全自动推断
- ⚠️ **需要手动实现**：订阅的发布-订阅逻辑需要开发者手动实现

### 4.6 上下文（Context）

**支持情况**：✅ **完整支持**

Pylon 提供了完整的 Context 支持，通过 `getContext()` 和 `setContext()` API 访问。

从源码 `packages/pylon/src/context.ts` 可以看出：

```ts
import { AsyncLocalStorage } from 'async_hooks'

export const asyncContext = new AsyncLocalStorage<Context>()

export const getContext = () => {
  const ctx = asyncContext.getStore()
  if (!ctx) {
    throw new Error('Context not defined')
  }
  ctx.env = env(ctx)
  return ctx
}

export const setContext = (context: Context) => {
  return asyncContext.enterWith(context)
}
```

**特点**：
- ✅ **AsyncLocalStorage**：使用 Node.js 的 `AsyncLocalStorage` 实现上下文传递
- ✅ **类型安全**：Context 类型完全类型安全
- ✅ **支持中间件**：可以通过 Hono 中间件扩展 Context

### 4.7 中间件（Middleware）

**支持情况**：✅ **完整支持**

Pylon 基于 Hono，支持完整的中间件系统。

从业务代码可以看出：

```ts
// src/index.ts
import { app } from '@getcronit/pylon'

// 添加中间件
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**特点**：
- ✅ **Hono 中间件**：基于 Hono 的中间件系统，支持所有 Hono 中间件
- ✅ **GraphQL Yoga 插件**：支持 GraphQL Yoga 的插件系统（如 Sentry、Viewer 等）
- ✅ **类型安全**：中间件的 Context 类型完全类型安全

### 4.8 内置功能评估

**优点**：

1. **完整的订阅支持**：支持 GraphQL Subscription 的完整功能
2. **丰富的内置标量**：内置了常用的标量类型（Date、JSON、Object 等）
3. **灵活的中间件系统**：基于 Hono 和 GraphQL Yoga，支持丰富的中间件和插件
4. **完整的 Context 支持**：使用 AsyncLocalStorage 实现上下文传递

**缺点**：

1. **Directives 支持有限**：不提供声明式的 Directives 定义 API
2. **Extensions 支持有限**：不提供声明式的 Extensions 定义方式
3. **无内置 DataLoader**：需要手动实现批量加载逻辑
4. **无 Federation 支持**：不提供 Apollo Federation 的官方支持

**总结**：Pylon 的内置功能相对完整，支持订阅、自定义标量、中间件等核心功能。但 Directives、Extensions 和 DataLoader 的支持相对薄弱，需要手动实现。对于追求开发效率和类型安全的项目来说，这是一个**不错的选择**，但需要接受一些功能上的权衡。

---

## 5. 生态集成

### 5.1 ORM 集成

**支持情况**：✅ **支持，但需要手动集成**

Pylon **不提供内置的 ORM 集成**，但可以通过 Context 轻松集成 ORM。

从示例代码 `examples/cloudflare-drizzle-d1/src/index.ts` 可以看出：

```ts
import { getContext } from '@getcronit/pylon'
import { drizzle } from 'drizzle-orm/d1'

const getDb = () => {
  const ctx = getContext()
  return drizzle(ctx.env.DB, { schema })
}

export const graphql = {
  Query: {
    async users() {
      const db = getDb()
      const users = await db.query.user.findMany()
      return users.map(user => ({
        ...user,
        roles: JSON.parse(user.roles)
      }))
    }
  },
  Mutation: {
    async userCreate(data: {
      name: string
      email: string
      password: string
      roles: string[]
    }) {
      const db = getDb()
      const user = await db
        .insert(schema.user)
        .values({
          ...data,
          roles: JSON.stringify(data.roles),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning()
      return user
    }
  }
}
```

**特点**：
- ✅ **支持手动集成**：可以轻松集成 Drizzle、Prisma、TypeORM 等 ORM
- ❌ **无自动生成**：不提供类似 Pothos Prisma 插件的自动生成功能
- ⚠️ **需要手动实现**：需要手动编写数据库查询逻辑

### 5.2 验证库集成

**支持情况**：✅ **支持，但需要手动集成**

Pylon **不提供内置的验证库集成**，但可以通过 `createDecorator` 轻松集成验证库。

从业务代码可以看出，验证逻辑需要手动编写：

```ts
// 手动编写验证逻辑
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})
```

**特点**：
- ✅ **支持手动集成**：可以轻松集成 Zod、Valibot、Yup 等验证库
- ❌ **无自动集成**：不提供类似 Pothos Validation 插件的自动集成功能
- ⚠️ **需要手动实现**：需要手动编写验证逻辑

### 5.3 Server 兼容性

**支持情况**：✅ **完整支持**

Pylon 基于 Hono 和 GraphQL Yoga，支持多种 Server 和 Web 框架。

**支持的 Server**：
- ✅ **Node.js**：通过 `@hono/node-server` 支持
- ✅ **Cloudflare Workers**：原生支持
- ✅ **Bun**：原生支持
- ✅ **Deno**：原生支持

从源码可以看出，Pylon 使用 GraphQL Yoga，支持标准的 GraphQL Server 接口。

**特点**：
- ✅ **多平台支持**：支持 Node.js、Cloudflare Workers、Bun、Deno 等多个平台
- ✅ **标准接口**：使用 GraphQL Yoga，支持标准的 GraphQL Server 接口
- ✅ **灵活部署**：可以轻松部署到各种云平台

### 5.4 生态集成评估

**优点**：

1. **灵活的集成方式**：可以通过 Context 轻松集成 ORM、验证库等
2. **多平台支持**：支持 Node.js、Cloudflare Workers、Bun、Deno 等多个平台
3. **标准接口**：使用 GraphQL Yoga，支持标准的 GraphQL Server 接口

**缺点**：

1. **无自动集成**：不提供类似 Pothos 插件的自动集成功能
2. **需要手动实现**：需要手动编写数据库查询和验证逻辑
3. **生态相对薄弱**：相比 Pothos 等库，生态相对薄弱

**总结**：Pylon 的生态集成相对灵活，支持多种 Server 和 Web 框架。但 ORM 和验证库的集成需要手动实现，没有自动集成功能。对于追求开发效率和类型安全的项目来说，这是一个**不错的选择**，但需要接受生态集成上的权衡。

---

## 总结

Pylon 是一个基于 TypeScript Compiler API 的 GraphQL Schema 构建库，采用 **Inference（自动推断）模式**，通过构建时分析类型定义自动生成 GraphQL Schema。

### 核心优势

1. **零配置类型推断**：直接使用 TypeScript 类型，无需额外的 Schema 定义代码
2. **单一数据源**：TypeScript 类型定义是唯一的真实来源，避免类型不同步
3. **完整的类型安全**：充分利用 TypeScript 类型系统，编译时就能发现类型错误
4. **直观的 Resolver 定义**：直接使用 TypeScript 函数，无需额外的 API

### 核心劣势

1. **需要构建步骤**：必须运行构建命令才能生成 Schema，不是纯运行时方案
2. **依赖复杂度较高**：核心包引入了较多运行时依赖（GraphQL Yoga、Hono、Sentry 等）
3. **验证功能薄弱**：需要手动编写验证逻辑，无内置验证功能
4. **生态相对薄弱**：相比 Pothos 等库，生态相对薄弱，无自动集成功能

### 适用场景

Pylon 适合以下场景：
- ✅ 追求开发效率和类型安全的项目
- ✅ 需要零配置类型推断的项目
- ✅ 小型到中型项目
- ✅ 需要快速原型开发的项目

Pylon 不适合以下场景：
- ❌ 需要精细控制 Schema 构建过程的项目
- ❌ 需要丰富生态集成的项目
- ❌ 需要零运行时依赖的项目
- ❌ 需要纯运行时方案的项目

### 综合评分

| 维度                     | 评分  | 说明                                                               |
| ------------------------ | ----- | ------------------------------------------------------------------ |
| **架构模式**             | ⭐⭐⭐⭐  | Inference 模式优秀，但需要构建步骤和较多依赖                       |
| **类型定义**             | ⭐⭐⭐⭐⭐ | 类型定义方式非常直观，充分利用 TypeScript 类型系统                 |
| **解析器定义与输入验证** | ⭐⭐⭐   | Resolver 定义直观，但验证功能薄弱                                  |
| **内置功能**             | ⭐⭐⭐   | 支持订阅、自定义标量等核心功能，但 Directives、Extensions 支持有限 |
| **生态集成**             | ⭐⭐⭐   | 支持多种 Server，但 ORM 和验证库集成需要手动实现                   |

**总体评分**：⭐⭐⭐⭐（4/5）

Pylon 是一个**优秀的 GraphQL Schema 构建库**，特别适合追求开发效率和类型安全的项目。虽然在某些方面（如验证功能、生态集成）相对薄弱，但其零配置类型推断和单一数据源的设计理念使其成为一个值得考虑的选择。

---

