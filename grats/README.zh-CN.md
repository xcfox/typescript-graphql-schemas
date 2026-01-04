# Grats 评估报告

本报告基于对 Grats 源码、示例代码和实际业务代码的深入调研，从 5 个核心技术维度进行全面评估。

## 1. 架构模式

### 1.1 架构模式类型

Grats 采用 **Inference（自动推断）** 架构模式，通过分析 TypeScript 代码中的 JSDoc 注释来提取 GraphQL Schema 定义。

#### 核心机制

Grats 使用 TypeScript Compiler API 静态分析源代码，识别带有特定 JSDoc 标签的类型定义和函数，自动推断并生成 GraphQL Schema。开发者只需在代码中添加 JSDoc 注释标记，无需编写额外的 Schema 定义代码。

#### 实际代码示例

从业务代码 `src/models/user.ts` 可以看到典型的用法：

```ts
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}

/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())
}
```

#### 构建流程

根据源码 `src/lib.ts` 中的 `extractSchemaAndDoc` 函数，Grats 的构建流程如下：

1. **提取阶段**：使用 TypeScript Compiler API 创建 Program，通过 `extractSnapshotsFromProgram` 提取所有带有 JSDoc 标签的定义
2. **转换阶段**：经过一系列转换管道（Transform Pipeline）：
   - `filterNonGqlInterfaces` - 过滤非 GraphQL 接口
   - `resolveResolverParams` - 解析 Resolver 参数（区分 GraphQL 参数、Context、Info）
   - `resolveTypes` - 解析 TypeScript 类型引用到 GraphQL 类型
   - `addInterfaceFields` - 为接口实现类型添加字段
   - `applyDefaultNullability` - 应用默认可空性规则
   - `mergeExtensions` - 合并扩展定义
3. **验证阶段**：执行 GraphQL 规范验证和自定义验证
4. **代码生成阶段**：生成可执行的 TypeScript Schema 文件和 GraphQL SDL 文件

### 1.2 依赖复杂度

#### 运行时依赖

根据 `grats/package.json`，Grats 核心库的运行时依赖非常精简：

```json
{
  "dependencies": {
    "commander": "^14.0.1",
    "graphql": "^16.11.0",
    "semver": "^7.7.2",
    "typescript": "5.9.2"
  }
}
```

- **graphql**: GraphQL 核心库（必需）
- **typescript**: TypeScript Compiler API（用于静态分析）
- **commander**: CLI 命令行工具
- **semver**: 版本号比较工具

**注意**：`typescript` 作为运行时依赖是必要的，因为 Grats 需要在运行时使用 TypeScript Compiler API 来分析代码。

#### 构建时依赖

Grats 作为开发时工具，需要：

1. **代码生成步骤**：必须运行 `grats` CLI 命令来生成 Schema 文件
2. **无需装饰器支持**：不依赖 `reflect-metadata` 或实验性装饰器特性
3. **无需验证库绑定**：不强制绑定特定的验证库
4. **TypeScript 配置**：需要在 `tsconfig.json` 中添加 `grats` 配置块

#### 实际使用中的依赖

在业务代码中（`typescript-graphql-schemas/grats/package.json`），除了 Grats 本身，还需要：

```json
{
  "dependencies": {
    "graphql": "^16.12.0",
    "graphql-scalars": "^1.25.0",
    "graphql-yoga": "^5.18.0"
  },
  "devDependencies": {
    "grats": "^0.0.34"
  }
}
```

- `graphql-scalars`: 可选，用于自定义标量类型（如 DateTime）
- `graphql-yoga`: 可选，GraphQL Server 实现

### 1.3 构建过程分析

#### 源码实现

Grats 的 Schema 构建逻辑位于 `grats/src/lib.ts` 的 `extractSchemaAndDoc` 函数：

```ts
export function extractSchemaAndDoc(
  options: ParsedCommandLineGrats,
  program: ts.Program,
): DiagnosticsWithoutLocationResult<SchemaAndDoc> {
  return new ResultPipe(extractSnapshotsFromProgram(program, options))
    .map((snapshots) => combineSnapshots(snapshots))
    .andThen((snapshot) => {
      // ... 一系列转换和验证步骤
      const docResult = new ResultPipe(validationResult)
        .map(() => filterNonGqlInterfaces(ctx, snapshot.definitions))
        .andThen((definitions) => resolveResolverParams(ctx, definitions))
        .andThen((definitions) => resolveTypes(ctx, definitions))
        // ... 更多转换步骤
        .result();
      // ...
    })
    .result();
}
```

#### 代码生成

生成的 Schema 文件（`src/schema.ts`）是一个完整的 TypeScript 模块，导出 `getSchema` 函数：

```ts
export function getSchema(config: SchemaConfig): GraphQLSchema {
  // 使用 GraphQL.js API 构建 Schema
  const CoffeeType: GraphQLObjectType = new GraphQLObjectType({
    name: "Coffee",
    // ...
  });
  // ...
  return new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
    // ...
  });
}
```

#### 构建命令

在业务代码中，构建过程通过 npm scripts 触发：

```json
{
  "scripts": {
    "print": "grats && node src/print.ts",
    "test": "grats && node src/schema.test.ts"
  }
}
```

运行 `grats` 命令会：
1. 读取 `tsconfig.json` 中的 `grats` 配置
2. 分析项目中的所有 TypeScript 文件
3. 生成 `src/schema.ts`（可执行的 Schema）
4. 生成 `schema.graphql`（SDL 文件）

#### TypeScript 配置

需要在 `tsconfig.json` 中添加 Grats 配置：

```json
{
  "grats": {
    "importModuleSpecifierEnding": ".ts",
    "tsSchema": "./src/schema.ts"
  },
  "compilerOptions": {
    "module": "nodenext",
    "target": "esnext",
    "strict": true,
    "noEmit": true
  }
}
```

**注意**：`noEmit: true` 是推荐的配置，因为 Grats 会生成 Schema 文件，不需要 TypeScript 编译器输出。

### 1.4 架构模式评估

#### 优点

1. **零运行时开销**：生成的 Schema 是纯 TypeScript 代码，运行时直接使用 GraphQL.js API，无反射或元数据开销
2. **类型安全**：完全基于 TypeScript 类型系统，提供端到端的类型安全
3. **代码即文档**：JSDoc 注释既是 GraphQL 文档，也是类型定义，单一数据源
4. **无需装饰器**：不依赖实验性特性或运行时反射

#### 缺点

1. **必须运行构建步骤**：每次修改代码后需要运行 `grats` 命令重新生成 Schema
2. **IDE 支持有限**：虽然有实验性的 TypeScript 插件（`grats-ts-plugin`），但 IDE 智能提示不如装饰器模式直观
3. **学习曲线**：需要熟悉 JSDoc 标签系统，对于不熟悉 JSDoc 的开发者有一定学习成本
4. **代码生成文件**：生成的 `schema.ts` 文件较大（约 480 行），虽然可以 gitignore，但增加了项目复杂度

#### 与其他模式对比

- **vs Decorator 模式**：无需装饰器支持，但需要构建步骤
- **vs Builder 模式**：更简洁的代码，但需要理解 JSDoc 标签
- **vs Weaving 模式**：类型推断更自动，但构建过程更复杂

### 1.5 总结

Grats 的 **Inference（自动推断）** 架构模式通过 JSDoc 注释实现了零配置的 GraphQL Schema 生成。虽然需要构建步骤，但生成的代码是纯 TypeScript，运行时性能优秀。依赖复杂度低，无需装饰器或反射元数据，是一个轻量级且类型安全的解决方案。

**评分**：⭐⭐⭐⭐（4/5）
- 架构模式清晰，类型安全
- 依赖少，无需装饰器
- 需要构建步骤，IDE 支持有限

---

## 2. 类型定义

### 2.1 对象类型（ObjectType）

Grats 支持通过 `@gqlType` JSDoc 标签定义对象类型，可以使用 `type`、`interface` 或 `class`。

#### 使用 type 定义

```ts
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}
```

#### 使用 class 定义

```ts
/**
 * Coffee menu item
 * @gqlType
 */
export class Coffee implements Food {
  __typename = 'Coffee' as const
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  sugarLevel: SugarLevel
  /** @gqlField */
  origin: string

  constructor(id: Int, name: string, price: Float, sugarLevel: SugarLevel, origin: string) {
    this.id = id
    this.name = name
    this.price = price
    this.sugarLevel = sugarLevel
    this.origin = origin
  }
}
```

**特点**：
- ✅ **支持多种定义方式**：`type`、`interface`、`class` 都可以使用
- ✅ **字段自动映射**：TypeScript 类型自动映射为 GraphQL 类型（`Int`、`Float`、`String` 等）
- ✅ **单一数据源**：TypeScript 类型定义同时作为 GraphQL Schema 源，无需重复定义
- ⚠️ **需要显式标记字段**：每个字段都需要 `@gqlField` 标签

### 2.2 接口（Interface）

Grats 通过 `@gqlInterface` 标签定义接口，实现类型使用 `implements` 或 `extends` 关键字。

#### 定义接口

```ts
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
```

#### 实现接口

```ts
/**
 * Coffee menu item
 * @gqlType
 */
export class Coffee implements Food {
  __typename = 'Coffee' as const
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  sugarLevel: SugarLevel
  /** @gqlField */
  origin: string
  // ...
}
```

**特点**：
- ✅ **接口字段自动继承**：实现接口的类型会自动包含接口的所有字段（通过 `addInterfaceFields` 转换）
- ✅ **支持多接口实现**：TypeScript 的 `implements` 语法天然支持
- ✅ **类型安全**：TypeScript 编译器会检查接口实现是否完整
- ⚠️ **需要重复定义字段**：虽然接口字段会自动添加到 GraphQL Schema，但在 TypeScript 类型定义中仍需显式声明（这是 TypeScript 的要求）

**源码实现**（`src/transforms/addInterfaceFields.ts`）：
- 在构建阶段，Grats 会自动将接口字段添加到实现类型的 GraphQL Schema 定义中
- 确保接口的公共字段在 GraphQL Schema 中正确继承

### 2.3 联合类型（Union）

Grats 通过 `@gqlUnion` 标签定义联合类型，使用 TypeScript 的 Union 类型语法。

#### 定义 Union

```ts
/**
 * Menu item union type
 * @gqlUnion
 */
export type MenuItem = Coffee | Dessert
```

#### __typename 要求

对于 Union 类型的成员，Grats 要求必须能够确定 `__typename`。有两种方式：

1. **显式定义 `__typename` 字段**（推荐）：
```ts
export class Coffee implements Food {
  __typename = 'Coffee' as const  // 必须使用 as const
  // ...
}
```

2. **使用导出的 class**（Grats 可以自动推断）：
```ts
export class Coffee implements Food {
  // Grats 可以从类名推断 __typename
}
```

**验证机制**（`src/validations/validateTypenames.ts`）：
- Grats 会验证所有 Union 成员和 Interface 实现类型都有 `__typename` 字段
- 如果类型没有导出或没有 `__typename`，会报错

**业务代码中的使用**：
```ts
/** @gqlQueryField */
export function menu(): MenuItem[] {
  return Array.from(menuMap.values())
}

/** @gqlMutationField */
export function updateCoffee(
  id: Int,
  // ...
): Coffee | null {
  const item = menuMap.get(id)
  if (!item || item.__typename !== 'Coffee') return null  // 需要手动检查 __typename
  // ...
}
```

**特点**：
- ✅ **直观的语法**：直接使用 TypeScript Union 类型，无需额外 API
- ✅ **自动验证**：构建时验证所有成员都有 `__typename`
- ⚠️ **需要手动处理 `__typename`**：在 Resolver 中需要手动检查 `__typename` 进行类型区分
- ⚠️ **类型守卫**：TypeScript 的类型守卫（如 `item.__typename !== 'Coffee'`）是必需的

### 2.4 枚举类型（Enum）

Grats 支持两种方式定义枚举：

#### 方式 1：字符串联合类型（推荐）

```ts
/**
 * Sugar level for coffee
 * @gqlEnum
 */
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Order status
 * @gqlEnum
 */
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

#### 方式 2：TypeScript enum

```ts
/**
 * @gqlEnum
 */
export enum SugarLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}
```

**特点**：
- ✅ **零配置**：直接使用 TypeScript 类型，无需 `registerEnumType`
- ✅ **自动映射**：字符串联合类型或 enum 自动映射为 GraphQL EnumType
- ✅ **类型安全**：TypeScript 类型自动推断，提供完整的类型检查
- ✅ **支持描述**：JSDoc 注释自动成为 GraphQL Enum 的描述

**生成的 Schema**：
```graphql
"""Sugar level for coffee"""
enum SugarLevel {
  HIGH
  LOW
  MEDIUM
  NONE
}
```

### 2.5 输入类型（Input）

Grats 通过 `@gqlInput` 标签定义输入类型。

#### 定义 Input

```ts
/** @gqlInput */
type CreateUserInput = {
  name: string;
};
```

#### 在 Mutation 中使用

```ts
/**
 * Create a new user.
 * @gqlMutationField */
export async function createUser(
  input: CreateUserInput,
  vc: VC,
): Promise<CreateUserPayload> {
  const user = await DB.createUser(vc, input);
  return { user };
}
```

**特点**：
- ✅ **支持可选字段**：TypeScript 的可选属性（`?`）自动映射为可空的 GraphQL 输入字段
- ✅ **支持默认值**：可以通过 TypeScript 的默认值语法定义
- ✅ **支持 OneOf**：通过 `@oneOf` 标签支持 GraphQL OneOf 输入类型
- ⚠️ **仅支持对象字面量**：Input 类型必须是对象类型，不支持函数或方法

### 2.6 标量类型（Scalar）

Grats 通过 `@gqlScalar` 标签定义自定义标量类型。

#### 定义 Scalar

```ts
/** @gqlScalar */
export type DateTime = Date
```

#### 在 Schema 中使用

```ts
const schema = getSchema({
  scalars: {
    DateTime: DateTimeResolver,  // 需要提供实际的 resolver
  },
})
```

**特点**：
- ✅ **类型定义简洁**：只需定义 TypeScript 类型别名
- ⚠️ **需要手动提供 Resolver**：运行时需要提供序列化/反序列化逻辑（通常使用 `graphql-scalars` 等库）

### 2.7 类型映射机制

#### 自动类型映射

Grats 自动将 TypeScript 类型映射为 GraphQL 类型：

| TypeScript 类型 | GraphQL 类型     | 说明                     |
| --------------- | ---------------- | ------------------------ |
| `number`        | `Int` 或 `Float` | 根据使用场景推断         |
| `string`        | `String`         | 自动映射                 |
| `boolean`       | `Boolean`        | 自动映射                 |
| `T[]`           | `[T!]!`          | 数组自动映射为列表       |
| `T              | null`            | `T`（可空）              | 联合 null 表示可空   |
| `T              | undefined`       | `T`（可空）              | undefined 也表示可空 |
| `'A' \| 'B'`    | `Enum`           | 字符串联合类型映射为枚举 |

#### 特殊类型

Grats 提供了一些特殊类型（从 `grats` 包导入）：

```ts
import type { Int, Float, ID } from 'grats'

export type User = {
  id: Int      // 明确指定为 GraphQL Int
  price: Float // 明确指定为 GraphQL Float
  globalId: ID // GraphQL ID 类型
}
```

### 2.8 类型定义评估

#### 优点

1. **单一数据源**：TypeScript 类型定义同时作为 GraphQL Schema 源，完全避免重复定义
2. **类型安全**：完全基于 TypeScript 类型系统，提供端到端的类型安全
3. **直观的语法**：使用标准的 TypeScript 语法（type、interface、class、union），无需学习新的 API
4. **自动类型推断**：大部分类型可以自动推断，减少手动类型声明
5. **Interface 支持完善**：接口字段自动继承，实现简洁
6. **Enum 支持灵活**：支持字符串联合类型和 TypeScript enum，无需额外注册

#### 缺点

1. **需要显式标记**：每个类型和字段都需要 JSDoc 标签，代码略显冗长
2. **Union 类型需要手动处理 `__typename`**：在 Resolver 中必须手动检查 `__typename` 进行类型区分
3. **Input 类型限制**：仅支持对象类型，不支持函数或方法
4. **类型推断有限**：某些复杂类型（如泛型）可能无法自动推断，需要手动指定

### 2.9 总结

Grats 的类型定义能力非常强大，实现了单一数据源原则。通过 JSDoc 标签系统，将 TypeScript 类型直接映射为 GraphQL Schema，避免了重复定义。Interface 和 Enum 的支持都很直观，Union 类型虽然需要手动处理 `__typename`，但这是 GraphQL 的标准要求。整体而言，类型定义是 Grats 的强项。

**评分**：⭐⭐⭐⭐⭐（5/5）
- 单一数据源，类型安全
- 直观的语法，自动类型推断
- Interface 和 Enum 支持完善
- Union 类型需要手动处理 `__typename`（这是 GraphQL 标准要求）

---

## 3. 解析器定义与输入验证

### 3.1 解析器定义方式

Grats 通过 JSDoc 标签定义不同类型的 Resolver：

#### Query Resolver

```ts
/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())
}

/** @gqlQueryField */
export function user(id: Int): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  return user
}
```

#### Mutation Resolver

```ts
/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}
```

#### Field Resolver

```ts
/** @gqlField */
export function orders(user: User): Order[] {
  return getOrdersByUserId(user.id)
}

/** @gqlField */
export function user(order: Order): User {
  const user = userMap.get(order.userId)
  if (!user) throw new GraphQLError('User not found')
  return user
}
```

**特点**：
- ✅ **函数式定义**：使用普通 TypeScript 函数，无需类或装饰器
- ✅ **自动参数推断**：Grats 自动识别参数类型（GraphQL 参数、Source、Context、Info）
- ✅ **类型安全**：参数和返回值类型完全由 TypeScript 类型系统保证
- ✅ **模块化组织**：可以将 Query、Mutation 和 Field Resolver 拆分到不同文件

### 3.2 参数定义与推断

Grats 通过分析函数参数的类型来自动推断参数用途（`src/transforms/resolveResolverParams.ts`）：

#### 参数类型识别

Grats 支持以下参数类型：

1. **Source（父对象）**：第一个参数如果是 GraphQL 类型，自动识别为 Source
2. **GraphQL 参数**：普通类型参数（如 `Int`、`string`）自动识别为 GraphQL 参数
3. **Context**：使用 `@gqlContext` 标记的类型
4. **Info**：使用 `GqlInfo` 类型（从 `grats` 导入）
5. **参数对象**：单个对象参数，包含多个 GraphQL 参数

#### Context 注入

**定义 Context 类型**：

```ts
/** @gqlContext */
export type Ctx = YogaInitialContext & { vc: VC; credits: number };
```

**在 Resolver 中使用**：

```ts
/** @gqlMutationField */
export async function createUser(
  input: CreateUserInput,
  vc: VC,  // 自动注入 Context
): Promise<CreateUserPayload> {
  const user = await DB.createUser(vc, input);
  return { user };
}
```

**特点**：
- ✅ **灵活的参数位置**：Context 和 Info 可以放在参数列表的任何位置
- ✅ **类型安全**：Context 类型完全由 TypeScript 类型系统保证
- ✅ **Derived Context**：支持通过函数派生 Context（如 `getVc(ctx: Ctx): VC`）

#### Info 注入

```ts
import { GqlInfo } from 'grats'

/** @gqlField */
export async function posts(
  user: User,
  args: {
    first?: Int | null;
    after?: string | null;
  },
  info: GqlInfo,  // 自动注入 Info
): Promise<Connection<Post>> {
  // 可以使用 info 获取查询信息
  return connectionFromSelectOrCount(/* ... */, args, info)
}
```

**注意**：必须使用 `GqlInfo` 类型（从 `grats` 导入），不能使用 `GraphQLResolveInfo`（虽然它们是同一个类型）。

### 3.3 参数定义方式

#### 方式 1：位置参数（Positional Arguments）

```ts
/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // name 和 email 作为独立的 GraphQL 参数
}
```

生成的 GraphQL Schema：
```graphql
createUser(name: String!, email: String!): User
```

#### 方式 2：参数对象（Arguments Object）

```ts
/** @gqlField */
export async function posts(
  user: User,
  args: {
    first?: Int | null;
    after?: string | null;
    last?: Int | null;
    before?: string | null;
  },
  info: GqlInfo,
): Promise<Connection<Post>> {
  // args 对象包含所有 GraphQL 参数
}
```

**限制**：不能同时使用位置参数和参数对象。

### 3.4 输入验证

Grats **不提供内置的声明式验证功能**，所有验证都需要在 Resolver 中手动编写。

#### 格式验证

**业务代码示例**：

```ts
/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // 手动验证邮箱格式
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}
```

**特点**：
- ❌ **无内置验证**：不提供声明式验证 API（如 `.refine()`, `.validate()`）
- ⚠️ **手动验证**：需要在 Resolver 中手动编写 `if-throw` 逻辑
- ⚠️ **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用

#### 自定义验证（业务逻辑验证）

**业务代码示例**：

```ts
/** @gqlMutationField */
export function createOrder(userId: Int, items: Int[]): Order {
  // 1. 手动验证数组非空
  if (items.length === 0) {
    throw new GraphQLError('At least one item is required')
  }
  
  // 2. 手动验证用户是否存在
  if (!userMap.has(userId)) {
    throw new GraphQLError('User not found')
  }
  
  // 3. 手动验证所有菜单项是否存在
  for (const id of items) {
    if (!menuMap.has(id)) {
      throw new GraphQLError(`Menu item not found`)
    }
  }
  
  // ... 业务逻辑
}
```

**特点**：
- ❌ **无声明式验证**：不支持在 Schema 定义阶段注入验证函数
- ❌ **验证逻辑重复**：需要在每个 Resolver 中手动编写验证代码
- ⚠️ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式

#### 可选参数处理

Grats 支持 TypeScript 的可选参数语法：

```ts
/** @gqlMutationField */
export function updateUser(
  id: Int,
  name?: string | null,
  email?: string | null,
): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  
  // 使用 != null 检查（包括 null 和 undefined）
  if (name != null) user.name = name
  if (email != null) {
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    user.email = email
  }
  return user
}
```

生成的 GraphQL Schema：
```graphql
updateUser(
  id: Int!,
  name: String,
  email: String
): User
```

### 3.5 解析器定义与输入验证评估

#### 优点

1. **强大的类型推导**：参数和返回值类型完全由 TypeScript 类型系统保证，提供完整的类型安全
2. **灵活的参数定义**：支持位置参数和参数对象，Context 和 Info 可以放在任何位置
3. **模块化组织**：支持将 Query、Mutation 和 Field Resolver 拆分到不同文件，便于大型项目组织
4. **直观的函数式 API**：使用普通 TypeScript 函数，无需学习新的 API
5. **Derived Context 支持**：支持通过函数派生 Context，便于实现权限控制和数据加载

#### 缺点

1. **无内置验证功能**：不提供声明式验证 API，格式验证和业务逻辑验证都需要手动编写
2. **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用和组合
3. **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式
4. **无验证库集成**：虽然可以与 Zod 等验证库集成，但需要手动调用，没有深度集成

### 3.6 总结

Grats 的解析器定义非常直观，使用标准的 TypeScript 函数语法，参数类型自动推断，提供完整的类型安全。Context 和 Info 的注入机制灵活且类型安全。然而，输入验证是 Grats 的弱项，不提供内置的声明式验证功能，所有验证都需要在 Resolver 中手动编写，这增加了代码量和维护成本。

**评分**：⭐⭐⭐⭐（4/5）
- 解析器定义直观，类型安全
- 参数推断强大，Context 注入灵活
- 无内置验证功能，验证逻辑分散

---

## 4. 内置功能

### 4.1 Directives（指令）

**支持情况**：✅ **完整支持**

Grats 支持定义和使用 GraphQL Directives。

#### 定义 Directive

```ts
/**
 * Some fields cost credits to access. This directive specifies how many credits
 * a given field costs.
 *
 * @gqlDirective cost on FIELD_DEFINITION
 */
export function debitCredits(args: { credits: Int }, context: Ctx): void {
  if (context.credits < args.credits) {
    throw new GraphQLError(
      `Insufficient credits remaining. This field cost ${args.credits} credits.`,
    );
  }
  context.credits -= args.credits;
}
```

#### 使用 Directive

Directive 需要在运行时通过 Schema 转换来应用（使用 `@graphql-tools/utils`）：

```ts
import { getDirective, MapperKind, mapSchema } from "@graphql-tools/utils";

export function applyCreditLimit(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const costDirective = getDirective(schema, fieldConfig, "cost");
      if (costDirective == null || costDirective.length === 0) {
        return fieldConfig;
      }
      const originalResolve = fieldConfig.resolve ?? defaultFieldResolver;
      fieldConfig.resolve = (source, args, context, info) => {
        debitCredits(costDirective[0] as CostArgs, context);
        return originalResolve(source, args, context, info);
      };
      return fieldConfig;
    },
  });
}
```

#### 在 Schema 中标注 Directive

```ts
/**
 * @gqlField
 * @gqlAnnotate cost(credits: 5)
 */
export function expensiveField(): string {
  return "expensive data";
}
```

**特点**：
- ✅ **支持 Directive 定义**：通过 `@gqlDirective` 标签定义 Directive
- ✅ **支持 Directive 标注**：通过 `@gqlAnnotate` 标签在 Schema 中标注 Directive
- ✅ **类型验证**：Grats 会验证 Directive 参数类型
- ⚠️ **需要手动实现运行时逻辑**：Directive 的运行时行为需要手动通过 Schema 转换实现
- ⚠️ **Federation 支持**：可以通过 `@gqlAnnotate` 标注 Federation Directives，但没有专门的 Federation 支持包

### 4.2 Extensions（扩展）

**支持情况**：⚠️ **有限支持**

Grats 生成的 Schema 是标准的 GraphQL Schema，可以通过 GraphQL.js 的 Extensions API 使用，但 Grats 本身不提供声明式的 Extensions 定义方式。

**使用方式**：
- 需要在生成的 Schema 基础上手动添加 Extensions
- 或者通过 Directive 实现类似功能

### 4.3 批量加载（Batching / DataLoader）

**支持情况**：⚠️ **不提供内置支持，但可以通过 Context 实现**

Grats **不提供内置的 DataLoader 支持**，但可以通过在 Context 中集成 DataLoader 来实现批量加载。

#### 实现方式

**在 Context 中创建 DataLoader**：

```ts
import DataLoader from "dataloader";

export class VC {
  _postLoader: DataLoader<string, Post>;
  _userLoader: DataLoader<string, User>;
  
  constructor() {
    this._postLoader = new DataLoader((ids) => getPostsByIds(this, ids));
    this._userLoader = new DataLoader((ids) => getUsersByIds(this, ids));
  }
  
  async getPostById(id: string): Promise<Post> {
    return this._postLoader.load(id);
  }
}

/** @gqlContext */
export type Ctx = YogaInitialContext & { vc: VC };
```

**在 Resolver 中使用**：

```ts
/** @gqlField */
export async function posts(user: User, vc: VC): Promise<Post[]> {
  // 通过 Context 中的 DataLoader 批量加载
  return vc.getPostById(user.id);
}
```

**特点**：
- ❌ **无内置 DataLoader**：不提供类似 `dataloader` 的批量加载和缓存机制
- ✅ **可以通过 Context 实现**：在 Context 中集成 DataLoader 是可行的方案
- ⚠️ **需要手动实现**：批量加载逻辑需要开发者手动实现，无法自动解决 N+1 查询问题
- ⚠️ **无路径感知缓存**：无法自动实现基于 GraphQL 查询路径的缓存

### 4.4 自定义标量（Scalars）

**支持情况**：✅ **支持**

Grats 支持通过 `@gqlScalar` 标签定义自定义标量类型。

#### 定义 Scalar

```ts
/**
 * A date and time. Serialized as a Unix timestamp.
 *
 * @gqlScalar Date
 * @gqlAnnotate specifiedBy(url: "https://example.com/html/spec-for-date-as-unix-timestamp")
 */
export type GqlDate = Date;
```

#### 提供 Resolver

```ts
import { Kind } from "graphql";
import type { SchemaConfig } from "../schema";

export const scalarConfig: SchemaConfig["scalars"] = {
  Date: {
    serialize(value) {
      if (value instanceof Date) {
        return value.getTime(); // Convert outgoing Date to integer for JSON
      }
      throw Error("GraphQL Date Scalar serializer expected a `Date` object");
    },
    parseValue(value) {
      if (typeof value === "number") {
        return new Date(value); // Convert incoming integer to Date
      }
      throw new Error("GraphQL Date Scalar parser expected a `number`");
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(parseInt(ast.value, 10));
      }
      throw new Error("GraphQL Date Scalar parser expected an `Int`");
    },
  },
};
```

#### 在 Schema 中使用

```ts
const schema = getSchema({ scalars: scalarConfig });
```

**特点**：
- ✅ **类型定义简洁**：只需定义 TypeScript 类型别名
- ✅ **支持 Directive 标注**：可以通过 `@gqlAnnotate` 标注 `@specifiedBy` 等 Directive
- ⚠️ **需要手动提供 Resolver**：运行时需要提供序列化/反序列化逻辑（通常使用 `graphql-scalars` 等库）

### 4.5 订阅（Subscription）

**支持情况**：✅ **支持**

Grats 支持通过 `@gqlSubscriptionField` 标签定义 Subscription。

#### 定义 Subscription

```ts
import { Int } from "grats";

/** @gqlSubscriptionField */
export async function* countdown(args: { from: Int }): AsyncIterable<Int> {
  for (let i = args.from; i >= 0; i--) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    yield i;
  }
}
```

**特点**：
- ✅ **支持 AsyncIterable**：Subscription Resolver 必须返回 `AsyncIterable`
- ✅ **自动验证**：Grats 会验证 Subscription 字段返回 `AsyncIterable`
- ✅ **类型安全**：TypeScript 类型系统保证返回值类型

### 4.6 上下文（Context）

**支持情况**：✅ **完整支持**

Grats 通过 `@gqlContext` 标签支持 Context 注入，已在维度3中详细说明。

**特点**：
- ✅ **灵活的参数位置**：Context 可以放在参数列表的任何位置
- ✅ **类型安全**：Context 类型完全由 TypeScript 类型系统保证
- ✅ **Derived Context**：支持通过函数派生 Context

### 4.7 中间件（Middleware）

**支持情况**：❌ **不提供内置支持**

Grats **不提供内置的中间件功能**，但可以通过以下方式实现：

1. **通过 Directive**：使用 Directive 实现类似中间件的功能
2. **通过 Context**：在 Context 中实现权限检查、日志记录等功能
3. **通过 Server 层**：在 GraphQL Server（如 Yoga）层面实现中间件

### 4.8 内置功能评估

#### 优点

1. **Directives 支持完善**：支持定义和使用 Directives，类型验证完善
2. **Subscription 支持**：支持 GraphQL Subscription，类型安全
3. **Scalars 支持**：支持自定义标量类型，定义简洁
4. **Context 支持完善**：Context 注入机制灵活且类型安全

#### 缺点

1. **无内置 DataLoader**：不提供内置的批量加载支持，需要手动实现
2. **无内置中间件**：不提供声明式的中间件 API
3. **Extensions 支持有限**：不提供声明式的 Extensions 定义方式
4. **Directive 运行时逻辑需要手动实现**：虽然支持定义和标注，但运行时逻辑需要手动通过 Schema 转换实现

### 4.9 总结

Grats 在 Directives、Subscription、Scalars 和 Context 方面提供了良好的支持，类型安全且使用直观。然而，在批量加载和中间件方面缺乏内置支持，需要开发者手动实现。整体而言，内置功能覆盖了 GraphQL 的核心需求，但在高级功能方面有所欠缺。

**评分**：⭐⭐⭐（3/5）
- Directives、Subscription、Scalars 支持完善
- Context 支持灵活
- 无内置 DataLoader 和中间件支持

---

## 5. 生态集成

### 5.1 ORM 集成

**支持情况**：❌ **无官方插件**

Grats **不提供官方的 ORM 集成插件**（如 Prisma、Drizzle、TypeORM 插件）。

**影响**：
- 无法直接复用数据库模型定义
- 无法自动生成高效的数据库查询
- 需要在 Resolver 中手动编写数据库查询逻辑

**替代方案**：

可以在 Resolver 中手动使用 ORM（如 Prisma Client）进行数据库查询：

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** @gqlQueryField */
export async function users(): Promise<User[]> {
  // 手动使用 Prisma Client
  return await prisma.user.findMany()
}
```

**特点**：
- ❌ **无官方插件**：不提供类似 Pothos Prisma 插件或 GQLoom Prisma 集成的高级功能
- ⚠️ **需要手动映射**：需要手动将数据库模型映射为 GraphQL 类型
- ⚠️ **无法自动生成**：无法自动生成 CRUD 操作，需要手动编写

### 5.2 验证库集成

**支持情况**：⚠️ **需要手动实现**

Grats **不提供内置的验证库集成**（如 Zod、Yup、Valibot），但可以通过自定义 Scalar 或手动验证实现。

#### 方式 1：通过自定义 Scalar

```ts
import { z } from 'zod'
import { GraphQLError } from 'graphql'

const emailSchema = z.string().email()

/**
 * @gqlScalar Email
 */
export type Email = string

export const emailScalarConfig = {
  Email: {
    serialize(value: Email): string {
      return value
    },
    parseValue(value: unknown): Email {
      const result = emailSchema.safeParse(value)
      if (!result.success) {
        throw new GraphQLError('Invalid email format')
      }
      return result.data
    },
    parseLiteral(ast) {
      // ... 实现 parseLiteral
    },
  },
}
```

#### 方式 2：在 Resolver 中手动验证

```ts
import { z } from 'zod'
import { GraphQLError } from 'graphql'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // 手动调用 Zod Schema 验证
  const result = createUserSchema.safeParse({ name, email })
  if (!result.success) {
    throw new GraphQLError(result.error.errors[0].message)
  }
  // ... 业务逻辑
}
```

**特点**：
- ⚠️ **需要手动实现**：虽然支持 Zod 集成，但需要为每个验证规则创建自定义 Scalar 或在 Resolver 中手动调用
- ⚠️ **无声明式验证**：不如提供声明式验证 API 的库方便（如 GQLoom）
- ✅ **灵活性高**：可以选择任何验证库，不受限制

### 5.3 Server 兼容性

**支持情况**：✅ **广泛支持**

Grats 生成的 Schema 是标准的 GraphQL Schema（使用 GraphQL.js API），兼容所有 GraphQL Server 实现。

#### GraphQL Yoga

```ts
import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { getSchema } from './schema.ts'

const yoga = createYoga({
  schema: getSchema({
    scalars: {
      DateTime: DateTimeResolver,
    },
  }),
})

const server = createServer(yoga)
server.listen(4000)
```

#### Apollo Server

```ts
import { ApolloServer } from '@apollo/server'
import { getSchema } from './schema.ts'

const server = new ApolloServer({
  schema: getSchema({ scalars: scalarConfig }),
})

await server.start()
```

#### Express GraphQL

```ts
import express from 'express'
import { graphqlHTTP } from 'express-graphql'
import { getSchema } from './schema.ts'

const app = express()
app.use('/graphql', graphqlHTTP({
  schema: getSchema({ scalars: scalarConfig }),
  graphiql: true,
}))
```

#### Next.js

```ts
// app/api/graphql/route.ts
import { getSchema } from '../schema'
import { createYoga } from 'graphql-yoga'

const yoga = createYoga({
  schema: getSchema({ scalars: scalarConfig }),
})

export async function GET(request: Request) {
  return yoga.handleRequest(request)
}

export async function POST(request: Request) {
  return yoga.handleRequest(request)
}
```

**特点**：
- ✅ **标准 GraphQL Schema**：生成的 Schema 是标准 GraphQL Schema，兼容所有 Server
- ✅ **无框架绑定**：不绑定特定的 Server 实现，可以自由选择
- ✅ **插件支持**：可以无缝使用 Server 的插件（如 Yoga 的 `useDeferStream`）

### 5.4 生态集成评估

#### 优点

1. **Server 兼容性优秀**：生成的 Schema 是标准 GraphQL Schema，兼容所有 GraphQL Server
2. **无框架绑定**：不绑定特定的 Server 实现，可以自由选择
3. **验证库集成支持**：虽然需要手动实现，但可以通过自定义 Scalar 集成验证库

#### 缺点

1. **无 ORM 集成**：不提供官方的 ORM 插件，无法直接复用数据库模型
2. **验证集成需要手动实现**：虽然支持 Zod 集成，但需要为每个验证规则创建自定义 Scalar
3. **无法自动生成**：无法自动生成 CRUD 操作，需要手动编写

### 5.5 总结

Grats 在 Server 兼容性方面表现优秀，生成的 Schema 是标准 GraphQL Schema，可以无缝集成到任何 GraphQL Server 和框架中。但在 ORM 集成方面支持不足，需要手动编写数据库查询逻辑。验证库集成虽然支持，但需要手动实现，不如提供声明式验证 API 的库方便。

**评分**：⭐⭐⭐（3/5）
- Server 兼容性优秀，无框架绑定
- 无 ORM 集成，验证集成需要手动实现

---

## 总结

### 总体评分

| 维度                        | 评分        | 说明                                             |
| --------------------------- | ----------- | ------------------------------------------------ |
| **1. 架构模式**             | ⭐⭐⭐⭐ (4/5)  | Inference 模式，类型安全，需要构建步骤           |
| **2. 类型定义**             | ⭐⭐⭐⭐⭐ (5/5) | 单一数据源，类型安全，语法直观                   |
| **3. 解析器定义与输入验证** | ⭐⭐⭐⭐ (4/5)  | 解析器定义直观，类型安全，验证功能较弱           |
| **4. 内置功能**             | ⭐⭐⭐ (3/5)   | Directives、Subscription 支持完善，无 DataLoader |
| **5. 生态集成**             | ⭐⭐⭐ (3/5)   | Server 兼容性优秀，无 ORM 集成                   |

**综合评分**：⭐⭐⭐⭐（4/5）

### 核心优势

1. **单一数据源**：TypeScript 类型定义同时作为 GraphQL Schema 源，完全避免重复定义
2. **类型安全**：完全基于 TypeScript 类型系统，提供端到端的类型安全
3. **零运行时开销**：生成的 Schema 是纯 TypeScript 代码，运行时直接使用 GraphQL.js API
4. **Server 兼容性优秀**：生成的 Schema 是标准 GraphQL Schema，兼容所有 GraphQL Server

### 主要不足

1. **需要构建步骤**：每次修改代码后需要运行 `grats` 命令重新生成 Schema
2. **无内置验证功能**：不提供声明式验证 API，所有验证都需要在 Resolver 中手动编写
3. **无 ORM 集成**：不提供官方的 ORM 插件，无法直接复用数据库模型
4. **无内置 DataLoader**：不提供内置的批量加载支持，需要手动实现

### 适用场景

Grats 适合以下场景：
- ✅ 追求类型安全和单一数据源的项目
- ✅ 不需要复杂验证逻辑的项目
- ✅ 可以接受构建步骤的项目
- ✅ 需要与多种 GraphQL Server 集成的项目

不适合以下场景：
- ❌ 需要深度 ORM 集成的项目
- ❌ 需要声明式验证 API 的项目
- ❌ 需要内置 DataLoader 支持的项目
- ❌ 无法接受构建步骤的项目

---

*本报告基于 Grats v0.0.34 和实际业务代码实现，评估日期：2026年*