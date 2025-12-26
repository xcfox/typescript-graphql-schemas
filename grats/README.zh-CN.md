# Grats 评估报告

## 📋 基本信息

- **官网**: [https://grats.capt.dev/](https://grats.capt.dev/)
- **仓库地址**: [https://github.com/captbaritone/grats](https://github.com/captbaritone/grats)
- **首次 Release**: 2023-03-22 (v0.0.0)
- **最新 Release**: 2025-10-08 (v0.0.34)

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 7 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 6. 内置功能

**评估结果：核心功能支持良好，高级功能支持完善**

#### 上下文 (Context)

Grats 对 Context 有完善的支持，通过 `@gqlContext` 注释标记类型，支持类型安全的依赖注入。

**实现方式**：
```typescript
/** @gqlContext */
type GQLCtx = {
  req: Request;
  userID: string;
  db: Database;
};

/** @gqlQueryField */
export function me(ctx: GQLCtx): User {
  return ctx.db.users.getById(ctx.userID);
}
```

**Derived Context**：支持派生上下文值，可以定义函数来生成上下文值，支持依赖其他上下文值：
```typescript
/** @gqlContext */
type Ctx = { db: DB };

/** @gqlContext */
export function getDb(ctx: Ctx): DB {
  return ctx.db;
}

/** @gqlQueryField */
export function me(db: DB): string {
  return db.selectUser().name;
}
```

- ✅ **类型安全**：Context 类型完全基于 TypeScript 类型系统，编译时类型检查
- ✅ **灵活注入**：Context 参数可以放在函数参数列表的任何位置，无需固定位置
- ✅ **派生上下文**：支持派生上下文值，可以按需计算，支持缓存（使用 WeakMap）
- ✅ **文档完善**：有详细的文档说明和示例

**参考文档**：[Context | Grats](https://grats.capt.dev/docs/docblock-tags/context)

#### Directives

Grats 对 GraphQL Directives 有完善的支持，包括定义和使用。

**Directive 定义**：
使用 `@gqlDirective` 注释标记函数来定义 Directive：
```typescript
import { Int } from "grats";
/**
 * @gqlDirective on FIELD_DEFINITION
 */
function cost(args: { credits: Int }) {
  // ...
}
```

支持定义 Directive 的位置、是否可重复、参数等：
```typescript
/**
 * @gqlDirective cost repeatable on FIELD_DEFINITION | OBJECT
 */
function applyCost(args: { credits: Int }) {
  // ...
}
```

**Directive 注解**：
使用 `@gqlAnnotate` 注释在 Schema 中使用 Directive：
```typescript
/**
 * @gqlQueryField
 * @gqlAnnotate myDirective(someArg: "Some String")
 */
export function greet(): string {
  return "Hello";
}
```

**运行时访问**：
Directive 注解在运行时通过 `extensions.grats.directives` 访问：
```typescript
const foo = {
  extensions: {
    grats: {
      directives: [
        {
          name: "myDirective",
          args: { someArg: "Some Value" },
        },
      ],
    },
  },
};
```

- ✅ **完整支持**：支持定义和使用 GraphQL Directives
- ✅ **类型验证**：Grats 会验证 Directive 参数类型，确保类型安全
- ✅ **文档完善**：有详细的文档说明和示例（包括生产环境示例）

**参考文档**：
- [Directive Definitions | Grats](https://grats.capt.dev/docs/docblock-tags/directive-definitions)
- [Directive Annotations | Grats](https://grats.capt.dev/docs/docblock-tags/directive-annotations)

#### 批量加载 (Batching)

Grats 有专门的指南说明如何使用 DataLoader 来解决 N+1 查询问题。

**实现方式**：
DataLoader 可以通过 Context 集成，文档提供了详细的说明和最佳实践。DataLoader 的基本思想是将单个记录请求加入队列，等待一个事件循环后批量获取所有记录。

- ✅ **官方指南**：有专门的 DataLoader 使用指南
- ✅ **易于集成**：可以通过 Context 轻松集成 DataLoader
- ✅ **文档完善**：提供了详细的说明和实现模式

**参考文档**：[Dataloader | Grats](https://grats.capt.dev/docs/guides/dataloader)

#### 订阅 (Subscription)

Grats 完全支持 GraphQL Subscriptions，有专门的指南文档。

**实现方式**：
Subscription 字段必须返回 `AsyncIterable<T>` 类型：
```typescript
/** @gqlSubscriptionField */
export async function* countdown(): AsyncIterable<Int> {
  for (let i = 10; i >= 0; i--) {
    await sleep(1);
    yield i;
  }
}
```

- ✅ **完全支持**：完全支持 GraphQL Subscriptions
- ✅ **类型安全**：通过 TypeScript 类型系统确保返回 `AsyncIterable<T>`
- ✅ **文档完善**：有专门的指南文档和工作示例

**参考文档**：[Subscriptions | Grats](https://grats.capt.dev/docs/guides/subscriptions)

#### 自定义标量 (Scalars)

支持定义自定义标量类型，通过 `@gqlScalar` 注释标记，并在 Schema 配置中提供解析器：

```typescript
// grats/src/models/scalars.ts (lines 1-2)
/** @gqlScalar */
export type DateTime = Date
```

```typescript
// grats/src/server.ts (lines 7-13)
const yoga = createYoga({
  schema: getSchema({
    scalars: {
      DateTime: DateTimeResolver,
    },
  }),
})
```

- ✅ **易于定义**：通过 `@gqlScalar` 注释简洁定义标量类型
- ✅ **灵活集成**：可以集成第三方标量库（如 `graphql-scalars`）
- ✅ **类型安全**：标量类型基于 TypeScript 类型系统，类型安全有保障
- ✅ **配置集中**：标量解析器在 Schema 配置中统一管理

#### Extensions

Grats 支持 GraphQL Extensions，Directive 注解通过 `extensions.grats` 命名空间在运行时访问。

- ✅ **支持 Extensions**：通过 `extensions.grats.directives` 访问 Directive 注解
- ✅ **命名空间隔离**：使用 `grats` 命名空间避免冲突
- ✅ **运行时可用**：可以在执行时访问 Directive 信息

#### 中间件 (Middleware)

- ⚠️ **无官方中间件 API**：文档中未看到专门的中间件 API
- ⚠️ **可能通过 Context 实现**：可以通过 Context 注入中间件逻辑，但缺乏官方中间件 API
- ⚠️ **无文档说明**：未看到在解析过程中注入额外逻辑（如日志记录、权限检查）的官方方案

#### 联邦架构 (Federation)

- ❓ **未明确支持**：文档中未明确提及 GraphQL Federation 的支持
- ⚠️ **可能通过扩展实现**：由于生成标准的 `graphql-js` Schema，理论上可以通过第三方工具实现联邦，但缺乏官方支持

#### 扩展机制

- ❌ **无插件系统**：缺乏灵活的插件系统来扩展功能
- ✅ **基于 graphql-js**：由于生成标准的 `graphql-js` Schema，可以通过标准 GraphQL 扩展机制扩展
- ✅ **代码生成可扩展**：生成的 Schema 代码可以手动修改（虽然不推荐），提供了扩展的可能性

#### 总结

- ✅ **核心功能支持优秀**：Context、Directives、Subscriptions、DataLoader 等核心功能都有完善的支持
- ✅ **类型安全**：所有功能都基于 TypeScript 类型系统，类型安全有保障
- ✅ **文档完善**：有详细的文档说明和示例，包括生产环境示例
- ✅ **标准兼容**：生成标准的 `graphql-js` Schema，兼容 GraphQL 生态系统
- ⚠️ **中间件支持待完善**：缺乏官方中间件 API
- ❓ **联邦架构支持不明确**：未明确提及 Federation 支持

---

### 7. 生态集成

**评估结果：Server 兼容性优秀，TypeScript 集成完美，验证库和 ORM 集成待完善**

#### Server 兼容性

Grats 对主流 GraphQL Server 有优秀的兼容性支持，因为生成的 Schema 是标准的 `graphql-js` Schema。

**支持的 Server**：
根据示例代码和设计理念，Grats 可以与任何标准的 GraphQL Server 集成：

- ✅ **GraphQL Yoga**：示例代码中使用，有专门的示例项目
- ✅ **Apollo Server**：理论上支持（生成标准 `graphql-js` Schema）
- ✅ **express-graphql**：理论上支持（生成标准 `graphql-js` Schema）
- ✅ **其他标准 Server**：任何支持 `graphql-js` Schema 的服务器都可以使用

**实现方式**：
```typescript
// grats/src/server.ts (lines 7-13)
const yoga = createYoga({
  schema: getSchema({
    scalars: {
      DateTime: DateTimeResolver,
    },
  }),
})
```

- ✅ **无服务器绑定**：Grats 本身不绑定特定服务器，可以自由选择
- ✅ **易于集成**：通过 `getSchema()` 生成的 Schema 可以用于任何 GraphQL Server
- ✅ **标准兼容**：生成标准的 `graphql-js` Schema，兼容性极佳
- ✅ **零运行时依赖**：生成的 Schema 不依赖 Grats 本身，运行时完全独立

#### 验证库集成

- ❌ **无官方支持**：文档和代码中未看到与 Zod、Valibot、Yup 等验证库的集成示例
- ⚠️ **可手动实现**：可以在函数中手动使用验证库，但缺乏深度集成
- ⚠️ **无自动类型推导**：无法直接从验证库 Schema 自动推导 GraphQL 类型
- ⚠️ **无单一数据源**：验证逻辑、TypeScript 类型定义和 GraphQL Schema 需要分别维护

**示例**（手动集成）：
```typescript
import { z } from 'zod'

const emailSchema = z.string().email()

/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // 手动使用验证库
  const validatedEmail = emailSchema.parse(email)
  // ...
}
```

#### ORM 集成

- ❌ **未明确支持**：文档和代码中未看到与 Prisma、Drizzle、TypeORM 等 ORM 的深度整合
- ❌ **缺乏官方插件**：未看到类似 Pothos Prisma 插件的官方 ORM 集成方案
- ⚠️ **需要手动集成**：需要手动编写 Resolver 函数来连接 ORM，缺乏自动化支持
- ⚠️ **无 ResolverFactory**：未提供快速生成 CRUD 接口的工具

**示例**（手动集成）：
```typescript
import { prisma } from './prisma'

/** @gqlQueryField */
export async function users(): Promise<User[]> {
  return await prisma.user.findMany()
}
```

- ✅ **类型安全**：ORM 的类型定义可以直接用于 GraphQL 类型定义，保持类型一致性
- ⚠️ **需要手动映射**：需要手动将 ORM 模型映射到 GraphQL 类型

#### Web 框架集成

- ✅ **GraphQL Yoga**：示例代码中使用，支持多种传输协议
- ✅ **Node.js HTTP**：示例代码中使用原生 Node.js HTTP 服务器
- ✅ **Next.js**：理论上支持（生成标准 `graphql-js` Schema）
- ❓ **其他框架**：未明确看到 Hono、Fastify、Express 等框架的集成文档，但理论上都支持

#### 客户端集成

- ✅ **标准 GraphQL**：生成标准的 GraphQL Schema，可以与任何 GraphQL 客户端集成
- ✅ **GraphQL SDL 生成**：Grats 可以生成 `.graphql` 文件，供客户端代码生成工具使用
- ❓ **特定客户端**：未明确看到 Apollo Client、urql、GQty 等特定客户端的集成文档，但标准客户端都支持

#### TypeScript 工具链集成

- ✅ **TypeScript 原生**：完全基于 TypeScript 类型系统，与 TypeScript 工具链完美集成
- ✅ **IDE 支持**：利用 TypeScript 语言服务，IDE 提示完善
- ✅ **类型检查**：编译时类型检查，类型安全有保障
- ✅ **代码生成**：可以生成类型定义文件，供客户端使用

#### 总结

- ✅ **Server 兼容性优秀**：支持主流 GraphQL Server，无服务器绑定，兼容性极佳
- ✅ **标准兼容**：基于标准 `graphql-js`，可以与整个 GraphQL 生态集成
- ✅ **TypeScript 集成完美**：与 TypeScript 工具链完美集成，类型安全有保障
- ⚠️ **验证库集成待完善**：缺乏官方验证库集成方案，需要手动实现
- ❌ **ORM 集成缺失**：缺乏官方 ORM 集成方案，需要手动编写 Resolver
- ⚠️ **文档可改进**：某些集成场景的文档和示例可以更完善

**参考链接**：
- [Grats 官网](https://grats.capt.dev/)
- [Grats GitHub](https://github.com/captbaritone/grats)
- [Context | Grats](https://grats.capt.dev/docs/docblock-tags/context)
- [Directive Definitions | Grats](https://grats.capt.dev/docs/docblock-tags/directive-definitions)
- [Directive Annotations | Grats](https://grats.capt.dev/docs/docblock-tags/directive-annotations)
- [Dataloader | Grats](https://grats.capt.dev/docs/guides/dataloader)
- [Subscriptions | Grats](https://grats.capt.dev/docs/guides/subscriptions)

---

