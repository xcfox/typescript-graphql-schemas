# gqtx 评估报告

## 概述

`gqtx` 是一个轻量级的 TypeScript GraphQL Schema 构建库，它在 `graphql-js` 之上提供了一层类型安全的抽象。本报告将从 5 个核心技术维度对 gqtx 进行全面评估。

---

## 1. 架构模式

### 1.1 架构类型

gqtx 采用 **Builder（构建器）模式**，通过函数式 API 显式构建 GraphQL Schema 的中间表示（Intermediate Representation），然后在运行时将其转换为标准的 `graphql-js` Schema。

### 1.2 Schema 构建过程

gqtx 的 Schema 构建分为两个阶段：

1. **定义阶段**：使用 `Gql` 命名空间下的辅助函数（如 `Gql.Object`、`Gql.Field`、`Gql.Enum` 等）创建类型安全的中间表示
2. **构建阶段**：调用 `buildGraphQLSchema()` 将中间表示转换为 `graphql.GraphQLSchema` 实例

核心构建逻辑位于 `build.ts`：

```ts
export function buildGraphQLSchema<RootSrc>(
  schema: Schema<RootSrc>
): graphql.GraphQLSchema {
  const typeMap = new Map();
  return new graphql.GraphQLSchema({
    query: toGraphQLOutputType<RootSrc>(
      schema.query,
      typeMap
    ) as graphql.GraphQLObjectType,
    mutation:
      schema.mutation &&
      (toGraphQLOutputType<RootSrc>(
        schema.mutation,
        typeMap
      ) as graphql.GraphQLObjectType<RootSrc>),
    subscription:
      schema.subscription &&
      toGraphQLSubscriptionObject(schema.subscription, typeMap),
    types:
      schema.types &&
      schema.types.map(
        (type) =>
          toGraphQLOutputType(type, typeMap) as graphql.GraphQLObjectType<
            any,
            any
          >
      ),
    directives: schema.directives,
  });
}
```

构建过程使用类型映射表（`typeMap`）来避免重复构建和循环引用，通过递归转换函数（`toGraphQLOutputType`、`toGraphQLInputType`）将中间表示转换为 `graphql-js` 类型。

### 1.3 类型安全机制

gqtx 通过 TypeScript 的泛型和条件类型实现类型安全，无需运行时反射或元数据：

- **Resolver 参数类型推导**：通过 `TOfArgMap<ArgMap<TArg>>` 自动推导参数类型
- **返回值类型校验**：通过 `OutputType<Out>` 确保 resolver 返回值与字段类型匹配
- **Source 类型校验**：通过泛型参数 `<Src>` 确保 resolver 的 source 参数类型正确

示例：

```ts
Gql.Field({
  name: 'userById',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
  },
  resolve: (_, args, ctx) => {
    // `args` 自动推导为 { id: string }
    // `ctx` 自动推导为 GqlContext（可通过模块扩展自定义）
    const user = ctx.users.find((u) => u.id === args.id);
    return user // 类型检查确保返回 User | null | undefined
  },
})
```

### 1.4 依赖复杂度

**依赖情况**：

- **运行时依赖**：仅 `graphql`（peer dependency，版本要求 `^16.7.0`）
- **开发依赖**：TypeScript、Rollup、Jest 等构建和测试工具
- **无运行时魔法**：
  - ❌ 不需要 `reflect-metadata`
  - ❌ 不需要装饰器支持（`experimentalDecorators`）
  - ❌ 不需要代码生成工具
  - ❌ 不需要编译时插件

**安装即用**：gqtx 实现了真正的"安装即用"，只需安装 `gqtx` 和 `graphql` 即可开始使用，无需任何额外配置。

### 1.5 模块化构建

gqtx 支持模块化组织 Schema，可以将 Query、Mutation 和类型定义拆分到不同文件：

```ts
// schema.ts
const Query = Gql.Query({
  fields: () =>
    [...userQueryFields, ...menuQueryFields, ...orderQueryFields] as FieldArray
})

const Mutation = Gql.Mutation({
  fields: () =>
    [...userMutationFields, ...menuMutationFields, ...orderMutationFields] as FieldArray
})

export const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
})
```

### 1.6 架构模式评估总结

**优点**：
- ✅ 纯函数式 API，无副作用，易于测试
- ✅ 零运行时开销，无需反射或元数据
- ✅ 依赖极简，仅需 `graphql` 作为 peer dependency
- ✅ 类型安全完全由 TypeScript 编译时保证
- ✅ 支持模块化组织，适合大型项目

**缺点**：
- ⚠️ 需要显式调用 `buildGraphQLSchema()` 进行构建（但这是运行时一次性操作，性能影响可忽略）
- ⚠️ 字段定义需要手动指定类型，无法从 TypeScript 类型自动推断（这是设计选择，保证了显式性和可控性）

**评分**：⭐⭐⭐⭐⭐（5/5）

gqtx 的架构模式非常优秀，实现了"零魔法"的类型安全 GraphQL Schema 构建，依赖极简，完全符合现代 TypeScript 开发的最佳实践。

---

## 2. 类型定义

### 2.1 对象类型（ObjectType）

gqtx 通过 `Gql.Object<Src>()` 定义对象类型，需要显式指定 TypeScript 类型作为泛型参数：

```ts
export const UserType = Gql.Object<User>({
  name: 'User',
  description: 'User information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
  ],
})
```

**特点**：
- ✅ 通过泛型 `<Src>` 绑定 TypeScript 类型，确保类型安全
- ✅ 字段定义使用函数式 API，支持循环引用（通过函数延迟求值）
- ⚠️ **需要手动定义每个字段**：无法从 TypeScript 类型自动推断字段
- ⚠️ **不是单一数据源**：需要同时维护 TypeScript 类型定义和 GraphQL 字段定义

**类型映射机制**：
- TypeScript 类型（如 `User`）仅用于类型检查和 resolver 的类型推导
- GraphQL Schema 完全由 `Gql.Object` 和 `Gql.Field` 的调用决定
- 两者需要手动保持同步，TypeScript 编译器无法自动检测不一致

### 2.2 接口（Interface）

gqtx 通过 `Gql.InterfaceType<Src>()` 定义接口，使用 `Gql.AbstractField` 定义抽象字段：

```ts
export const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  description: 'Food interface with common fields',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})
```

**实现接口**：

```ts
export const CoffeeType = Gql.Object<Coffee>({
  name: 'Coffee',
  description: 'Coffee menu item',
  interfaces: [FoodInterface],
  fields: () => [
    // 需要重复定义接口字段
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    // 特有字段
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})
```

**特点**：
- ✅ 支持接口定义和实现
- ✅ 支持多接口实现（通过数组传递）
- ⚠️ **需要重复定义接口字段**：实现接口的类型必须显式定义接口的所有字段，无法自动继承
- ⚠️ 接口字段和实现字段需要手动保持同步

### 2.3 联合类型（Union）

gqtx 通过 `Gql.Union<Src>()` 定义联合类型，需要手动实现 `resolveType` 函数：

```ts
export const MenuItemType = Gql.Union({
  name: 'MenuItem',
  description: 'Menu item union type',
  types: [CoffeeType, DessertType],
  resolveType: (value: MenuItem) => {
    return value.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})
```

**特点**：
- ✅ 支持 Union 类型定义
- ✅ `resolveType` 返回字符串类型名（符合 graphql-js v16 规范）
- ✅ 支持前向引用（`types` 可以是函数）
- ⚠️ **需要手动实现 `resolveType`**：必须根据数据判断返回哪个类型名
- ⚠️ **需要手动添加 `__typename`**：返回的数据必须包含 `__typename` 字段用于类型区分

**业务代码中的使用**：

```ts
// 创建时必须手动添加 __typename
const newItem: Coffee = {
  __typename: 'Coffee',  // 必须手动添加
  id,
  name,
  price,
  sugarLevel,
  origin,
}
```

### 2.4 枚举类型（Enum）

gqtx 通过 `Gql.Enum<Src>()` 定义枚举，需要手动指定每个枚举值的名称和值：

```ts
export const SugarLevelEnum = Gql.Enum({
  name: 'SugarLevel',
  description: 'Sugar level for coffee',
  values: [
    { name: 'NONE', value: 'NONE' },
    { name: 'LOW', value: 'LOW' },
    { name: 'MEDIUM', value: 'MEDIUM' },
    { name: 'HIGH', value: 'HIGH' },
  ],
})
```

**特点**：
- ✅ 支持枚举定义
- ⚠️ **不支持直接使用 TypeScript enum**：不能直接传入 TypeScript `enum`，需要手动转换为 `values` 数组
- ⚠️ **不支持 `as const` 数组**：不能直接使用 `['NONE', 'LOW'] as const`，需要手动转换为对象数组
- ⚠️ **需要手动维护枚举值**：TypeScript 类型定义和 GraphQL Enum 定义需要手动保持同步

**对比其他库**：
- **Garph**：支持 `g.enumType('Status', ['PENDING', 'COMPLETED'] as const)`
- **GQLoom**：支持 `z.enum(['PENDING', 'COMPLETED'])`
- **gqtx**：需要手动转换为 `[{ name: 'PENDING', value: 'PENDING' }, ...]`

### 2.5 输入对象类型（InputObject）

gqtx 通过 `Gql.InputObject<Src>()` 定义输入类型：

```ts
const CreateUserInput = Gql.InputObject({
  name: 'CreateUserInput',
  fields: (self) => ({
    name: { type: Gql.NonNullInput(Gql.String) },
    email: { type: Gql.NonNullInput(Gql.String) },
  }),
})
```

**特点**：
- ✅ 支持输入对象类型定义
- ✅ 支持默认值（通过 `defaultValue` 字段）
- ⚠️ 同样需要手动定义字段，无法从 TypeScript 类型自动推断

### 2.6 类型定义评估总结

| 特性                | 评估       | 说明                                                      |
| ------------------- | ---------- | --------------------------------------------------------- |
| **单一数据源**      | ⭐⭐ (2/5)   | 需要同时维护 TypeScript 类型和 GraphQL 定义，无法自动同步 |
| **ObjectType 定义** | ⭐⭐⭐ (3/5)  | 直观但需要手动定义所有字段                                |
| **Union 支持**      | ⭐⭐⭐⭐ (4/5) | 支持良好，但需要手动实现 `resolveType`                    |
| **Interface 支持**  | ⭐⭐⭐ (3/5)  | 支持但需要重复定义接口字段                                |
| **Enum 支持**       | ⭐⭐ (2/5)   | 不支持 TypeScript enum 或 `as const`，需要手动转换        |
| **类型推断**        | ⭐⭐ (2/5)   | 无法从 TypeScript 类型自动推断 GraphQL Schema             |

**优点**：
- ✅ 类型安全：通过泛型确保 TypeScript 类型与 GraphQL 类型的一致性
- ✅ 显式控制：所有类型定义都是显式的，易于理解和调试
- ✅ 支持复杂类型：Union、Interface、循环引用等都能良好支持

**缺点**：
- ⚠️ **不是单一数据源**：最大的问题是需要同时维护 TypeScript 类型定义和 GraphQL Schema 定义，两者需要手动保持同步
- ⚠️ **样板代码较多**：每个字段都需要手动定义，无法自动推断
- ⚠️ **Enum 定义繁琐**：不支持直接使用 TypeScript enum 或 `as const` 数组
- ⚠️ **接口字段重复**：实现接口时需要重复定义接口的所有字段

**评分**：⭐⭐⭐ (3/5)

gqtx 的类型定义功能完整，但缺乏自动推断能力，需要较多的样板代码。对于追求"单一数据源"和"零配置"的开发者来说，这可能是一个痛点。

---

## 3. 解析器定义与输入验证

### 3.1 解析器定义

gqtx 通过 `Gql.Field` 的 `resolve` 函数定义解析器，支持 Query、Mutation 和 Field Resolver：

```ts
// Query Resolver
Gql.Field({
  name: 'user',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
  },
  resolve: (_, { id }) => {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    return user
  },
})

// Mutation Resolver
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {
    // 业务逻辑
    const id = incrementId()
    const newUser: User = { id, name, email }
    userMap.set(id, newUser)
    return newUser
  },
})

// Field Resolver（关联查询）
Gql.Field({
  name: 'orders',
  type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
  resolve: (user) => {
    return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
  },
})
```

**特点**：
- ✅ 支持模块化组织：可以将 Query、Mutation 和类型定义拆分到不同文件
- ✅ 支持默认 Resolver：如果字段名与 source 对象的属性名匹配，且类型一致，可以不提供 `resolve` 函数（使用 GraphQL 默认解析器）
- ✅ 类型安全：Resolver 的参数和返回值类型完全由 TypeScript 类型系统保证

### 3.2 参数定义与类型推导

gqtx 通过 `Gql.Arg()` 定义参数，参数类型通过 `TOfArgMap<ArgMap<TArg>>` 自动推导：

```ts
Gql.Field({
  name: 'updateUser',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),      // 必需参数
    name: Gql.Arg({ type: Gql.String }),                  // 可选参数
    email: Gql.Arg({ type: Gql.String }),                   // 可选参数
  },
  resolve: (_, { id, name, email }) => {
    // id: number (自动推导)
    // name: string | null | undefined (自动推导)
    // email: string | null | undefined (自动推导)
  },
})
```

**类型推导机制**：

```ts
// 类型定义（types.ts）
export type ArgMapValue<TArg> = TArg extends DefaultArgument<infer Src>
  ? Src
  : TArg extends Argument<infer Src>
  ? Src extends null
    ? Maybe<Src>
    : Src
  : never;

export type TOfArgMap<TArgMap> = {
  [K in keyof TArgMap]: ArgMapValue<TArgMap[K]>;
};

// Field 类型定义
export type Field<Src, Out, TArg extends object = {}> = {
  resolve?: (
    src: Src,
    args: TOfArgMap<ArgMap<TArg>>,  // 自动推导参数类型
    ctx: GqlContext,
    info: graphql.GraphQLResolveInfo
  ) => Out | Promise<Out>;
}
```

**特点**：
- ✅ **完整的类型推导**：参数类型完全自动推断，无需手动声明
- ✅ **支持可选参数**：通过 `Gql.String`（可空）和 `Gql.NonNullInput(Gql.String)`（非空）区分
- ✅ **支持默认值**：通过 `Gql.Arg({ type: Gql.String, default: 'defaultValue' })` 设置默认值
- ✅ **支持列表类型**：通过 `Gql.ListInput(Gql.NonNullInput(Gql.Int))` 定义列表参数

### 3.3 格式验证

gqtx **不提供内置的格式验证功能**，所有格式验证都需要在 Resolver 内部手动编写。

#### 手动验证（当前实现方式）

```ts
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {
    // 手动编写格式验证
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    // ... 业务逻辑
  },
})
```

#### 通过自定义 Scalar 实现验证

gqtx 支持通过自定义 Scalar 类型实现格式验证：

```ts
const EmailScalar = Gql.Scalar({
  name: 'Email',
  serialize: (value) => value,
  parseValue: (value: unknown) => {
    if (typeof value !== 'string' || !value.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
  parseLiteral: (ast) => {
    if (ast.kind !== 'StringValue') {
      throw new GraphQLError('Email must be a string')
    }
    if (!ast.value.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    return ast.value
  },
})

// 使用自定义 Scalar
Gql.Field({
  name: 'createUser',
  args: {
    email: Gql.Arg({ type: Gql.NonNullInput(EmailScalar) }),
  },
  resolve: (_, { email }) => {
    // email 已经通过验证
  },
})
```

**验证特点**：
- ❌ **无内置验证**：不提供声明式验证 API（如 `.refine()`, `.validate()`）
- ✅ **支持自定义 Scalar**：可以通过 Scalar 实现格式验证
- ⚠️ **验证逻辑分散**：格式验证需要在 Resolver 或 Scalar 中手动实现，难以复用

### 3.4 自定义验证（业务逻辑验证）

gqtx **不提供 Schema 级别的自定义验证功能**，所有业务逻辑验证都需要在 Resolver 内部手动编写。

#### 当前实现方式

```ts
Gql.Field({
  name: 'createOrder',
  type: Gql.NonNull(OrderType),
  args: {
    userId: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    items: Gql.Arg({ type: Gql.NonNullInput(Gql.ListInput(Gql.NonNullInput(Gql.Int))) }),
  },
  resolve: (_, { userId, items }) => {
    // 1. 手动验证数组非空
    if (items.length === 0) {
      throw new GraphQLError('At least one item is required')
    }
    
    // 2. 手动验证用户是否存在
    if (!userMap.has(userId)) {
      throw new GraphQLError('User not found')
    }
    
    // 3. 手动验证所有菜单项是否存在
    for (const itemId of items) {
      if (!menuItemMap.has(itemId)) {
        throw new GraphQLError('Menu item not found')
      }
    }
    
    // ... 业务逻辑
  },
})
```

**验证特点**：
- ❌ **无声明式验证**：不支持在 Schema 定义阶段注入验证函数（如 `.refine()`）
- ❌ **验证逻辑重复**：需要在每个 Resolver 中手动编写验证代码
- ⚠️ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式
- ⚠️ **难以复用**：验证逻辑无法提取为可复用的函数或中间件

### 3.5 Context（上下文）支持

gqtx 支持通过模块扩展（Module Augmentation）自定义 Context 类型：

```ts
// 全局定义 Context 类型
declare module "gqtx" {
  interface GqlContext {
    viewerId: number;
    users: User[];
  }
}

// 在 Resolver 中使用
Gql.Field({
  name: 'userById',
  resolve: (_, args, ctx) => {
    // ctx 自动推导为 { viewerId: number, users: User[] }
    const user = ctx.users.find((u) => u.id === args.id)
    return user
  },
})
```

**特点**：
- ✅ **类型安全**：Context 类型全局定义，所有 Resolver 自动推断
- ✅ **集中管理**：Context 类型定义集中在一个地方，易于维护
- ⚠️ **需要模块扩展**：必须使用 TypeScript 的模块扩展语法

### 3.6 解析器定义与输入验证评估总结

| 特性             | 评估        | 说明                                        |
| ---------------- | ----------- | ------------------------------------------- |
| **参数类型推导** | ⭐⭐⭐⭐⭐ (5/5) | 完整的类型推导，参数类型完全自动推断        |
| **格式验证**     | ⭐⭐ (2/5)    | 无内置验证，需要手动编写或使用自定义 Scalar |
| **自定义验证**   | ⭐⭐ (2/5)    | 无声明式验证，需要在 Resolver 中手动编写    |
| **验证复用性**   | ⭐⭐ (2/5)    | 验证逻辑难以复用和组合                      |
| **模块化组织**   | ⭐⭐⭐⭐ (4/5)  | 支持将 Resolver 拆分到不同文件              |

**优点**：
- ✅ **强大的类型推导**：参数和返回值类型完全自动推断，提供完整的 IDE 提示
- ✅ **模块化组织**：支持将 Query、Mutation 和 Field Resolver 拆分到不同文件
- ✅ **类型安全**：Resolver 的类型安全完全由 TypeScript 编译时保证
- ✅ **支持自定义 Scalar**：可以通过自定义 Scalar 实现格式验证

**缺点**：
- ❌ **无内置验证功能**：不提供声明式验证 API，格式验证和业务逻辑验证都需要手动编写
- ❌ **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用和组合
- ❌ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式
- ⚠️ **验证难以复用**：无法将验证逻辑提取为可复用的函数或中间件

**评分**：⭐⭐⭐ (3/5)

gqtx 在类型推导方面表现优秀，但在验证功能方面较为薄弱。对于需要复杂验证逻辑的项目，开发者需要手动编写大量验证代码，这可能会影响开发效率和代码可维护性。

---

## 4. 内置功能

### 4.1 Directives（指令）

**支持情况**：✅ **基础支持**

gqtx 支持通过 `schema.directives` 传递 GraphQL Directives：

```ts
const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
  directives: [
    // 自定义 Directives
    new graphql.GraphQLDirective({
      name: 'auth',
      locations: [graphql.DirectiveLocation.FIELD_DEFINITION],
    }),
  ],
})
```

**Extensions 配置支持**：

gqtx 支持通过 `extensions` 字段配置扩展信息（包括 Directives）：

```ts
Gql.Object<User>({
  name: 'User',
  extensions: {
    directives: {
      key: { fields: 'id' },
    },
  },
  fields: () => [...],
})

Gql.Field({
  name: 'secret',
  type: Gql.String,
  extensions: {
    directives: {
      auth: { role: 'admin' },
    },
  },
})
```

**特点**：
- ✅ 支持 Schema 级别的 Directives 配置
- ✅ 支持通过 Extensions 配置字段和对象类型的 Directives
- ⚠️ **无高级 API**：不提供定义自定义 Directives 的高级 API，需要直接使用 `graphql.GraphQLDirective`
- ⚠️ **Federation 支持有限**：虽然可以通过 Extensions 配置 Federation Directives，但没有专门的 Federation 支持包

### 4.2 Extensions（扩展）

**支持情况**：✅ **完整支持**

gqtx 支持字段级别和对象类型级别的 Extensions：

```ts
// 字段级别扩展
Gql.Field({
  name: 'complexField',
  type: Gql.String,
  extensions: {
    complexity: 10,
    customField: 'value',
  },
})

// 对象类型级别扩展
Gql.Object<User>({
  name: 'User',
  extensions: {
    directives: {
      key: { fields: 'id' },
    },
    customTypeExtension: 'value',
  },
  fields: () => [...],
})
```

**特点**：
- ✅ 支持标准的 GraphQL Extensions 配置
- ✅ 类型安全：Extensions 配置类型安全
- ✅ 可以用于查询复杂度、权限等扩展需求

### 4.3 批量加载（Batching / DataLoader）

**支持情况**：❌ **不提供内置支持**

gqtx **不提供内置的 DataLoader 支持**，但提供了 Relay Connection 模式的辅助函数，可以用于实现分页：

```ts
import { connectionDefinitions, connectionArgs } from 'gqtx/relay'

const { connectionType } = connectionDefinitions({
  nodeType: UserType,
})

Gql.Field({
  name: 'users',
  type: connectionType,
  args: connectionArgs,
  resolve: async (_, args) => {
    // 需要手动实现批量加载逻辑
    const users = await fetchUsers(args)
    return createConnectionFromArray(users, args)
  },
})
```

**特点**：
- ❌ **无内置 DataLoader**：不提供类似 `dataloader` 的批量加载和缓存机制
- ✅ **Relay Connection 支持**：提供 Relay Connection 模式的辅助函数
- ⚠️ **需要手动实现**：批量加载逻辑需要开发者手动实现，无法自动解决 N+1 查询问题

**对比其他库**：
- **GQLoom**：内置 `LoomDataLoader`，自动批量加载
- **Pothos**：提供 DataLoader 插件
- **gqtx**：需要手动实现或集成第三方 DataLoader 库

### 4.4 自定义标量（Scalars）

**支持情况**：✅ **完整支持**

gqtx 通过 `Gql.Scalar()` 定义自定义标量：

```ts
import { GraphQLDateTime } from 'graphql-scalars'

export const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})

// 使用自定义标量
Gql.Field({
  name: 'createdAt',
  type: Gql.NonNull(DateTime),
})
```

**特点**：
- ✅ 支持完整的 Scalar 定义（`serialize`、`parseValue`、`parseLiteral`）
- ✅ 可以轻松集成 `graphql-scalars` 等标量库
- ✅ 类型安全：Scalar 类型与 TypeScript 类型绑定

**内置标量**：
- `Gql.String`、`Gql.Int`、`Gql.Float`、`Gql.Boolean`、`Gql.ID`
- 不提供 `DateTime`、`JSON` 等常用标量，需要手动定义或集成第三方库

### 4.5 订阅（Subscription）

**支持情况**：✅ **完整支持**

gqtx 通过 `Gql.Subscription()` 和 `Gql.SubscriptionField()` 定义订阅：

```ts
const Subscription = Gql.Subscription({
  fields: () => [
    Gql.SubscriptionField({
      name: 'orderStatusChanged',
      type: OrderType,
      args: {
        orderId: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      subscribe: async function* (_, { orderId }) {
        // 返回 AsyncIterableIterator
        while (true) {
          const order = await getOrder(orderId)
          yield order
          await sleep(1000)
        }
      },
    }),
  ],
})

const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
})
```

**特点**：
- ✅ 支持完整的 GraphQL Subscription 功能
- ✅ 支持 `AsyncIterableIterator` 模式
- ✅ 类型安全：订阅字段的参数和返回值类型完全自动推断
- ⚠️ **需要手动实现**：订阅的发布-订阅逻辑需要开发者手动实现

### 4.6 Context（上下文）

**支持情况**：✅ **完整支持**

已在维度 3 中详细评估，此处不再重复。

### 4.7 中间件（Middleware）

**支持情况**：❌ **不提供内置支持**

gqtx **不提供内置的中间件系统**，无法在 Resolver 执行前后注入中间件逻辑。

**替代方案**：
1. **在 Resolver 内部手动实现**：在每个 Resolver 中手动调用中间件函数
2. **使用 GraphQL Server 的中间件**：在 Server 层面（如 Apollo Server、GraphQL Yoga）使用中间件
3. **封装 Resolver 函数**：创建高阶函数包装 Resolver

**示例（手动实现）**：

```ts
function withAuth<T extends (...args: any[]) => any>(resolver: T): T {
  return ((...args: any[]) => {
    const ctx = args[2] // context
    if (!ctx.user) {
      throw new GraphQLError('Unauthorized')
    }
    return resolver(...args)
  }) as T
}

Gql.Field({
  name: 'secret',
  type: Gql.String,
  resolve: withAuth((_, args, ctx) => {
    return 'secret data'
  }),
})
```

**特点**：
- ❌ **无内置中间件系统**：不提供声明式的中间件 API
- ⚠️ **需要手动实现**：中间件逻辑需要开发者手动实现，无法统一管理

### 4.8 内置功能评估总结

| 功能             | 支持情况   | 评估        | 说明                               |
| ---------------- | ---------- | ----------- | ---------------------------------- |
| **Directives**   | ✅ 基础支持 | ⭐⭐⭐ (3/5)   | 支持 Extensions 配置，但无高级 API |
| **Extensions**   | ✅ 完整支持 | ⭐⭐⭐⭐⭐ (5/5) | 类型安全，功能完整                 |
| **Batching**     | ❌ 不支持   | ⭐⭐ (2/5)    | 无内置 DataLoader，需要手动实现    |
| **Scalars**      | ✅ 完整支持 | ⭐⭐⭐⭐ (4/5)  | 支持自定义，但无常用标量内置       |
| **Subscription** | ✅ 完整支持 | ⭐⭐⭐⭐⭐ (5/5) | API 清晰，类型安全                 |
| **Context**      | ✅ 完整支持 | ⭐⭐⭐⭐⭐ (5/5) | 类型安全，集中管理                 |
| **Middleware**   | ❌ 不支持   | ⭐⭐ (2/5)    | 无内置中间件系统                   |

**优点**：
- ✅ **Extensions 支持完整**：可以满足查询复杂度、权限等扩展需求
- ✅ **Subscription 支持完整**：API 清晰，类型安全
- ✅ **Scalar 支持灵活**：可以轻松集成常用标量库

**缺点**：
- ❌ **无内置 DataLoader**：无法自动解决 N+1 查询问题
- ❌ **无内置中间件系统**：无法统一管理中间件逻辑
- ⚠️ **Directives 支持有限**：虽然支持，但无高级 API

**评分**：⭐⭐⭐ (3/5)

gqtx 在核心功能（Subscription、Context、Extensions）方面支持完整，但在高级功能（DataLoader、Middleware）方面较为薄弱。对于需要批量加载和中间件的项目，开发者需要手动实现或集成第三方库。

---

## 5. 生态集成

### 5.1 ORM 集成

**支持情况**：❌ **无官方插件**

gqtx **不提供官方的 ORM 集成插件**（如 Prisma、Drizzle、TypeORM 插件）。

**影响**：
- 无法直接复用数据库模型定义
- 无法自动生成高效的数据库查询
- 需要在 Resolver 中手动编写数据库查询逻辑

**替代方案**：

可以在 Resolver 中手动使用 ORM（如 Prisma Client）进行数据库查询：

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

Gql.Field({
  name: 'users',
  type: Gql.NonNull(Gql.List(Gql.NonNull(UserType))),
  resolve: async () => {
    // 手动使用 Prisma Client
    return await prisma.user.findMany()
  },
})
```

**特点**：
- ❌ **无官方插件**：不提供类似 Pothos Prisma 插件或 GQLoom Prisma 集成的高级功能
- ⚠️ **需要手动映射**：需要手动将数据库模型映射为 GraphQL 类型
- ⚠️ **无法自动生成**：无法自动生成 CRUD 操作，需要手动编写

**对比其他库**：
- **Pothos**：提供 Prisma 插件，自动生成类型和查询
- **GQLoom**：提供 `@gqloom/prisma` 包，深度集成 Prisma
- **gqtx**：需要手动使用 ORM，无官方插件

### 5.2 验证库集成

**支持情况**：✅ **支持（通过自定义 Scalar）**

gqtx 支持与验证库（如 Zod、Yup）集成，但需要通过自定义 Scalar 实现。

#### Zod 集成示例

```ts
import { z } from 'zod'
import { Gql } from 'gqtx'
import { GraphQLError } from 'graphql'

// 定义 Zod Schema
const emailValidator = z.string().email()

// 创建自定义 Scalar
const EmailScalar = Gql.Scalar({
  name: 'Email',
  serialize: (value) => value,
  parseValue: (value: unknown) => {
    if (typeof value !== 'string' || !emailValidator.safeParse(value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
  parseLiteral: (ast) => {
    if (ast.kind !== 'StringValue') {
      throw new GraphQLError('Email must be a string')
    }
    if (!emailValidator.safeParse(ast.value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return ast.value
  },
})

// 使用自定义 Scalar
Gql.Field({
  name: 'createUser',
  args: {
    email: Gql.Arg({ type: Gql.NonNullInput(EmailScalar) }),
  },
  resolve: (_, { email }) => {
    // email 已经通过 Zod 验证
  },
})
```

**特点**：
- ✅ **支持 Zod 集成**：可以通过自定义 Scalar 使用 Zod 进行验证
- ⚠️ **需要手动实现**：需要为每个验证规则创建自定义 Scalar
- ⚠️ **验证与 Schema 分离**：验证逻辑在 Scalar 中，不在 Schema 定义层面
- ⚠️ **无法声明式验证**：不支持类似 Pothos validation 插件的声明式验证 API

**对比其他库**：
- **Pothos**：提供 validation 插件，支持声明式验证
- **GQLoom**：通过 Weaver 模式深度集成 Zod，自动验证
- **gqtx**：需要手动创建自定义 Scalar，验证逻辑分散

### 5.3 Server 兼容性

**支持情况**：✅ **广泛支持**

gqtx 生成的 Schema 是标准的 `graphql.GraphQLSchema`，可以用于任何 GraphQL Server。

#### GraphQL Server

**GraphQL Yoga**（业务代码中使用）

```ts
import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { schema } from './schema.ts'

const yoga = createYoga({ schema })
const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
```

**Express + express-graphql**（官方示例中使用）

```ts
import express from 'express'
import graphqlHTTP from 'express-graphql'
import { schema } from './schema'

const app = express()

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true,
  })
)

app.listen(4000)
```

**Apollo Server**

```ts
import { ApolloServer } from 'apollo-server'
import { schema } from './schema'

const server = new ApolloServer({
  schema,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
```

**特点**：
- ✅ **标准 GraphQL Schema**：生成的 Schema 是标准的 `graphql.GraphQLSchema`，兼容所有 GraphQL Server
- ✅ **无框架绑定**：不绑定特定的 Server 实现，可以自由选择
- ✅ **广泛兼容**：支持 Apollo Server、GraphQL Yoga、express-graphql 等主流 Server

#### Web 框架

gqtx 生成的 Schema 可以用于任何支持 GraphQL 的 Web 框架：

- ✅ **Next.js**：可以通过 API Routes 使用
- ✅ **Fastify**：可以通过 `@fastify/apollo` 使用
- ✅ **Hono**：可以通过 GraphQL 适配器使用
- ✅ **其他框架**：任何支持 GraphQL 的框架都可以使用

### 5.4 生态集成评估总结

| 功能              | 支持情况   | 评估        | 说明                                 |
| ----------------- | ---------- | ----------- | ------------------------------------ |
| **ORM 集成**      | ❌ 不支持   | ⭐⭐ (2/5)    | 无官方插件，需要手动使用 ORM         |
| **验证库集成**    | ✅ 支持     | ⭐⭐⭐ (3/5)   | 通过自定义 Scalar，需要手动实现      |
| **Server 兼容性** | ✅ 广泛支持 | ⭐⭐⭐⭐⭐ (5/5) | 标准 GraphQL Schema，兼容所有 Server |

**优点**：
- ✅ **Server 兼容性优秀**：生成的 Schema 是标准 GraphQL Schema，兼容所有 GraphQL Server
- ✅ **无框架绑定**：不绑定特定的 Server 实现，可以自由选择
- ✅ **验证库集成支持**：虽然需要手动实现，但可以通过自定义 Scalar 集成验证库

**缺点**：
- ❌ **无 ORM 集成**：不提供官方的 ORM 插件，无法直接复用数据库模型
- ⚠️ **验证集成需要手动实现**：虽然支持 Zod 集成，但需要为每个验证规则创建自定义 Scalar
- ⚠️ **无法自动生成**：无法自动生成 CRUD 操作，需要手动编写

**评分**：⭐⭐⭐ (3/5)

gqtx 在 Server 兼容性方面表现优秀，生成的 Schema 是标准 GraphQL Schema，可以无缝集成到任何 GraphQL Server 和框架中。但在 ORM 集成方面支持不足，需要手动编写数据库查询逻辑。验证库集成虽然支持，但需要手动实现，不如提供声明式验证 API 的库方便。

---

## 总结

### 总体评分

| 维度                        | 评分        | 说明                                          |
| --------------------------- | ----------- | --------------------------------------------- |
| **1. 架构模式**             | ⭐⭐⭐⭐⭐ (5/5) | Builder 模式，零运行时开销，依赖极简          |
| **2. 类型定义**             | ⭐⭐⭐ (3/5)   | 功能完整但需要较多样板代码，不是单一数据源    |
| **3. 解析器定义与输入验证** | ⭐⭐⭐ (3/5)   | 类型推导优秀，但验证功能较弱                  |
| **4. 内置功能**             | ⭐⭐⭐ (3/5)   | 核心功能完整，但缺少 DataLoader 和 Middleware |
| **5. 生态集成**             | ⭐⭐⭐ (3/5)   | Server 兼容性优秀，但无 ORM 集成              |

**综合评分**：⭐⭐⭐ (3.4/5)

### 核心优势

1. **极简依赖**：仅 `graphql` 作为 peer dependency，安装即用，无需任何额外配置
2. **零运行时开销**：纯函数式 API，无反射或元数据，完全由 TypeScript 编译时保证类型安全
3. **强大的类型推导**：参数和返回值类型完全自动推断，提供完整的 IDE 提示
4. **标准 GraphQL Schema**：生成的 Schema 是标准的 `graphql.GraphQLSchema`，兼容所有 GraphQL Server
5. **模块化组织**：支持将 Query、Mutation 和类型定义拆分到不同文件，适合大型项目

### 主要不足

1. **不是单一数据源**：需要同时维护 TypeScript 类型定义和 GraphQL Schema 定义，两者需要手动保持同步
2. **验证功能较弱**：不提供声明式验证 API，格式验证和业务逻辑验证都需要手动编写
3. **无内置 DataLoader**：无法自动解决 N+1 查询问题，需要手动实现或集成第三方库
4. **无 ORM 集成**：不提供官方的 ORM 插件，无法直接复用数据库模型
5. **样板代码较多**：每个字段都需要手动定义，无法自动推断

### 适用场景

**适合的项目**：
- ✅ 追求极简依赖和零运行时开销的项目
- ✅ 需要完全控制 Schema 定义的项目
- ✅ 不需要复杂验证逻辑的项目
- ✅ 不需要 ORM 集成的项目（或愿意手动使用 ORM）
- ✅ 需要与多种 GraphQL Server 集成的项目

**不适合的项目**：
- ❌ 需要自动从数据库模型生成 Schema 的项目
- ❌ 需要复杂验证逻辑的项目
- ❌ 需要批量加载和缓存的项目（除非愿意手动实现）
- ❌ 追求"单一数据源"和"零配置"的项目

### 最终评价

gqtx 是一个**轻量级、类型安全**的 GraphQL Schema 构建库，在架构设计和类型推导方面表现优秀。它实现了"零魔法"的类型安全，依赖极简，完全符合现代 TypeScript 开发的最佳实践。

然而，gqtx 在**验证功能**、**ORM 集成**和**批量加载**方面较为薄弱，需要开发者手动实现大量功能。对于追求"单一数据源"和"零配置"的开发者来说，gqtx 可能不是最佳选择。

**推荐使用场景**：
- 小型到中型的 GraphQL API 项目
- 需要完全控制 Schema 定义的项目
- 不需要复杂验证和 ORM 集成的项目
- 追求极简依赖和零运行时开销的项目

**不推荐使用场景**：
- 需要从数据库模型自动生成 Schema 的项目
- 需要复杂验证逻辑的项目
- 需要批量加载和缓存的项目
- 追求"单一数据源"和"零配置"的项目

---

**报告完成时间**：2026年1月
**评估版本**：gqtx 0.9.3

