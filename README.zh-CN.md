# TypeScript GraphQL Schema 构建选型对比 (2026)

这是一个用于横向对比 2026 年主流 TypeScript GraphQL Schema 构建库的示例项目。我们通过实现一个相同的业务场景——**“极简在线咖啡点餐系统”**，来评估不同工具的开发效率（DX）、类型安全性和样板代码量。

## 📚 GraphQL Schema 库列表

- [x] **[TypeGraphQL](https://typegraphql.com/)**
- [x] **[Nexus](https://nexusjs.org/)**
- [x] **[Pothos](https://pothos-graphql.dev/)**
- [x] **[Grats](https://grats.capt.dev/)**
- [x] **[gqtx](https://github.com/sikanhe/gqtx)**
- [x] **[GQLoom](https://gqloom.dev/)**
- [x] **[Pylon](https://pylon.cronit.io/)**
- [x] **[garph](https://garph.dev/)**

## ☕ 业务模型：咖啡点餐系统

每个库都必须实现以下核心领域模型和逻辑：

- **User**: 用户信息（id, name, email）。
- **Food**: 菜单项接口，定义公共字段（id, name, price）。
- **Coffee**: 咖啡类型，实现 `Food`，特有属性 `sugarLevel`（含糖量：NONE | LOW | MEDIUM | HIGH）和 `origin`（产地，如 "Colombia", "Ethiopia"）。
- **Dessert**: 点心类型，实现 `Food`，特有属性 `calories`（卡路里）。
- **MenuItem**: 联合类型（Union），`MenuItem = Coffee | Dessert`，用于展示各库对 Union 类型的支持。
- **Order**: 订单（id, createdAt, status, userId, itemIds）。
- **关联查询**:
  - `User.orders`: 获取用户的所有订单。
  - `Order.user`: 获取订单的下单人信息。
  - `Order.items`: 获取订单内的商品详情（返回 `MenuItem` Union 类型，需支持内联片段查询特有字段）。
- **业务验证**:
  - 下单时校验 `userId` 和 `itemIds` 必须在内存数据库中存在。

## 🛠️ 快速开始

### 安装依赖
```bash
pnpm install
```

### 运行 GQLoom 示例
```bash
# 启动开发服务器 (支持热重载)
pnpm dev:gqloom

# 仅打印并生成 schema.graphql
pnpm print:gqloom
```

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 7 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 1. 架构模式
架构模式决定了代码的组织方式以及 Schema 的构建逻辑，是选型时最先需要考虑的因素。
- **定义**：库是如何将 TypeScript 代码转换为 GraphQL Schema 的。
  - **Decorator (装饰器)**：使用类和装饰器来定义类型，依赖反射元数据。
  - **Builder (构建器)**：使用函数式 API 显式构建类型定义。
  - **Weaving (编织)**：通过组合独立的 Resolver 和 Schema 定义来构建，通常与推断结合。
  - **Inference (自动推断)**：直接分析 TypeScript 类型定义生成 Schema，追求零配置。
  - **Schema 构建**：将定义的类型和 Resolver 组装成可执行的 GraphQL Schema 实例的过程。不同的架构模式对应不同的构建方式，如 `buildSchema()`（装饰器）、`builder.toSchema()`（构建器）、`weave()`（编织）或静态分析工具（推断）。
- **评判标准**：优秀的架构模式应当在提供足够灵活性的同时，最小化运行时开销，并保持代码的纯净与可测试性。避免过度的元数据反射（Reflection）和全局副作用是现代库的趋势。构建过程应当简单、配置集中，支持模块化构建以便于大型项目的拆分与协作。

### 2. 依赖复杂度
- **定义**：引入该库所需的外部依赖数量及其体积。
- **评判标准**：依赖越少越好。轻量级的库通常意味着更快的安装速度、更小的 Bundle 体积以及更低的维护成本。避免强制绑定特定的运行时框架（如必须使用特定版本的 Class Validator 或 Reflect Metadata）是加分项。

### 3. 类型定义
类型定义是 Schema 构建的核心，决定了 TypeScript 类型与 GraphQL 类型如何映射。
- **定义**：开发者如何声明 GraphQL 的 ObjectType、InputType 及其字段。
  - **对象类型**：如何映射 Class 或 Interface 到 GraphQL Object。
  - **联合类型 (Union)**：是否支持直观地定义 Union 类型，并能自动处理 `__typename` 决议。
  - **接口 (Interface)**：定义和实现 GraphQL Interface 的简便程度。
  - **枚举类型 (Enum)**：TypeScript 枚举与 GraphQL 枚举的映射机制。能否直接复用 TypeScript 的 `enum` 或 `as const` 对象，而无需繁琐的手动注册步骤（`registerEnumType`）或重复定义名称。支持直接映射字符串联合类型（String Union Types）也是现代库的一个重要特性。
- **评判标准**：**单一数据源（Single Source of Truth）**是最高标准。理想的库应当能够从一份定义同时生成运行时验证逻辑、TypeScript 类型接口以及 GraphQL Schema，杜绝重复定义导致的类型不同步问题。

### 4. 解析器定义
- **定义**：库如何定义和组织 Resolver（解析器）逻辑。
- **评判标准**：代码应当简洁且具备高度的类型安全性。理想的设计应当支持高内聚的模块化组织，利于领域驱动开发（DDD），能够将业务逻辑与 Schema 定义优雅地解耦或紧密集成。

### 5. 输入验证与参数定义
- **定义**：库如何处理 GraphQL 的输入参数（Arguments）和输入对象（Input Object）的定义、类型推导以及验证。
  - **参数定义**：如何在 Resolver 中定义和获取查询参数。链式调用或从函数参数自动推断的方式通常比配置对象或装饰器更符合 TypeScript 的直觉。
  - **格式验证**：如何对输入进行格式校验（如 Email 格式、字符串长度）。验证逻辑应当与类型定义紧密结合，支持声明式验证且无需引入额外的验证库（或能与主流验证库如 Zod 无缝集成）。
  - **自定义验证**：处理复杂业务逻辑验证（如“检查用户是否存在”、“库存是否充足”）的能力。支持在 Schema 定义阶段注入自定义验证函数（如 `.refine`），而不是在 Resolver 内部手动编写过程式的 `if-throw` 逻辑。
- **评判标准**：参数定义应当具备完整的类型推导能力，能提供更好的 IDE 提示。验证逻辑应当易于复用和组合，显著提升代码的可维护性。

### 6. 内置功能
内置功能决定了库在应对复杂业务场景时的“开箱即用”能力。
- **定义**：库是否原生支持 GraphQL 开发中的常见模式和进阶功能，减少样板代码（Boilerplate）。
  - **Directives**：是否支持 GraphQL Directives 的定义和使用，是否支持联邦架构 (Federation)。
  - **Extensions**：是否支持 GraphQL Extensions 的定义和使用，是否能够声明查询复杂度（complexity）等。
  - **批量加载 (Batching)**：原生支持 DataLoader 集成，以优雅地解决 N+1 查询问题。
  - **自定义标量 (Scalars)**：是否内置了常用的标量类型（如 `DateTime`, `JSON`, `BigInt`），以及定义新标量的简便程度。
  - **订阅 (Subscription)**：支持实时数据推送的便捷程度及其底层传输协议的兼容性。
  - **上下文 (Context)**：是否支持在 Resolver 中注入上下文，以及上下文的类型推导能力。
  - **中间件 (Middleware)**：是否支持在 Resolver 执行前后注入中间件逻辑（如日志记录、权限检查、性能监控）。
- **评判标准**：功能不应只是简单的堆砌，而应与核心 API 深度集成并保持类型安全。现代库应当通过灵活的插件系统（Plugin System）提供功能，既能避免核心库过于臃肿，又能显著减少开发者编写重复性逻辑的工作量。

### 7. 生态集成
生态集成衡量了库在整个 TypeScript 工具链中的协作能力，是决定项目长期可维护性的关键。
- **定义**：库与 TypeScript 生态中其他常用工具的互操作性。
  - **ORM 集成**：与 Prisma, Drizzle, TypeORM 等 ORM 的深度整合。能否直接复用数据库模型定义，甚至自动生成高效的数据库查询（如 Pothos 的 Prisma 插件）。
  - **验证库集成**：与 Zod, Valibot, Yup 等验证库的集成能力，实现从字段验证到类型推导的无缝链接。
  - **Server 兼容性**：对主流 Server（Apollo Server, Yoga）及 Web 框架（Hono, Fastify, Next.js）的适配程度。
- **评判标准**：优秀的集成应当能够消除“胶水代码”，构建端到端的类型安全链路。它应当是轻量且非侵入式的，允许开发者根据业务需求自由组合最佳实践工具栈。
