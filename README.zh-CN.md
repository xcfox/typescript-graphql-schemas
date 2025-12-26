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
- **MenuItem**: 菜单项（id, name, price, category: COFFEE | FOOD）。
- **Order**: 订单（id, createdAt, status, userId, itemIds）。
- **关联查询**:
  - `User.orders`: 获取用户的所有订单。
  - `Order.user`: 获取订单的下单人信息。
  - `Order.items`: 获取订单内的商品详情。
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

在评估 GraphQL Schema 构建库时，我们主要关注以下 6 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

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

### 6. 批处理集成
- **定义**：解决 GraphQL 经典的 N+1 查询问题的机制（通常通过 DataLoader）。
- **评判标准**：库是否内置了批处理支持，或者提供了直观的 API 来集成 DataLoader。优秀的实现应当让批处理逻辑像编写普通 Resolver 一样自然，无需手动管理 DataLoader 实例的生命周期。
