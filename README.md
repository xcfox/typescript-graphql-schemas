# TypeScript GraphQL Schema Library Comparison (2026)

This is an example project for horizontally comparing mainstream TypeScript GraphQL Schema building libraries in 2026. We evaluate different tools' development efficiency (DX), type safety, and boilerplate code by implementing the same business scenario—**"Minimalist Online Coffee Ordering System"**.

## 📚 GraphQL Schema Library List

- [x] **[TypeGraphQL](https://typegraphql.com/)**
- [x] **[Nexus](https://nexusjs.org/)**
- [x] **[Pothos](https://pothos-graphql.dev/)**
- [x] **[Grats](https://grats.capt.dev/)**
- [x] **[gqtx](https://github.com/sikanhe/gqtx)**
- [x] **[GQLoom](https://gqloom.dev/)**
- [x] **[Pylon](https://pylon.cronit.io/)**
- [x] **[garph](https://garph.dev/)**

## ☕ Business Model: Coffee Ordering System

Each library must implement the following core domain models and complete CRUD operations:

### Domain Models

- **User**: User information (id, name, email).
- **Food**: Menu item interface, defining common fields (id, name, price).
- **Coffee**: Coffee type, implementing the `Food` interface, with unique attributes:
  - `sugarLevel` (sugar level enum: NONE | LOW | MEDIUM | HIGH)
  - `origin` (origin string, such as "Colombia", "Ethiopia")
- **Dessert**: Dessert type, implementing the `Food` interface, with unique attributes:
  - `calories` (calories, floating point number)
- **MenuItem**: Union type, `MenuItem = Coffee | Dessert`, used to demonstrate each library's support for Union types.
- **Order**: Order information (id, createdAt, status, userId, itemIds).
  - `status` enum: PENDING | COMPLETED | CANCELLED
  - Default status is `PENDING` when created

### Query

#### User Module
- `users: [User!]!` - Query all users
- `user(id: Int!): User!` - Query user by ID, return error message "User not found" when user does not exist
- `User.orders: [Order!]!` - Association query: Get all orders for a user (associated via userId)

#### Menu Module
- `menu: [MenuItem!]!` - Query all menu items (returns Union type)
  - Must support inline fragment queries for unique fields:
    - `... on Coffee { sugarLevel, origin }`
    - `... on Dessert { calories }`
  - Returned data must include `__typename` field for type discrimination
- `menuItem(id: Int!): MenuItem` - Query menu item by ID (returns Union type, supports inline fragments)

#### Order Module
- `orders: [Order!]!` - Query all orders
- `order(id: Int!): Order` - Query order by ID
- `Order.user: User` - Association query: Get orderer information for an order (associated via userId)
- `Order.items: [MenuItem!]!` - Association query: Get item details within an order
  - Returns Union type, must support inline fragment queries for unique fields
  - Query corresponding menu items via itemIds array association

### Mutation

#### User Module
- `createUser(name: String!, email: String!): User!` - Create user
  - Email format validation: email must contain `@` symbol, otherwise return error message (containing "email" keyword)
- `updateUser(id: Int!, name: String, email: String): User!` - Update user
  - `name` and `email` are optional parameters
- `deleteUser(id: Int!): User` - Delete user, return deleted user information

#### Menu Module
- `createCoffee(name: String!, price: Float!, sugarLevel: SugarLevel!, origin: String!): Coffee!` - Create coffee
  - Returned Coffee object must include `__typename: "Coffee"` field
- `updateCoffee(id: Int!, name: String, price: Float, sugarLevel: SugarLevel, origin: String): Coffee` - Update coffee
  - All fields are optional parameters
  - Should return null or error if ID does not correspond to Coffee type
- `createDessert(name: String!, price: Float!, calories: Float!): Dessert!` - Create dessert
  - Returned Dessert object must include `__typename: "Dessert"` field
- `updateDessert(id: Int!, name: String, price: Float, calories: Float): Dessert` - Update dessert
  - All fields are optional parameters
  - Should return null or error if ID does not correspond to Dessert type
- `deleteMenuItem(id: Int!): MenuItem` - Delete menu item (returns Union type)

#### Order Module
- `createOrder(userId: Int!, items: [Int!]!): Order!` - Create order
  - Business validation (all must pass):
    1. `items` array cannot be empty, otherwise return error message (containing "At least one item is required")
    2. `userId` must exist in database, otherwise return error message (containing "User not found")
    3. All `itemId` in `items` array must exist in database, otherwise return error message (containing "Menu item not found")
  - When creation succeeds, order status defaults to `PENDING`
- `updateOrder(id: Int!, status: OrderStatus!): Order` - Update order status
- `deleteOrder(id: Int!): Order` - Delete order, return deleted order information

### Technical Requirements

1. **Union Type Support**:
   - Must correctly return `__typename` field
   - Must support inline fragment queries for unique fields
   - Need to distinguish types based on `__typename` in resolver

2. **Interface Support**:
   - `Coffee` and `Dessert` must implement `Food` interface
   - Interface common fields (id, name, price) are automatically inherited, no need to redefine

3. **Association Queries**:
   - Support association queries through association fields (such as `User.orders`, `Order.user`, `Order.items`)
   - Association queries should correctly handle Union types

4. **Error Handling**:
   - Should return clear error messages when querying non-existent resources
   - Should return descriptive error messages when business validation fails

## 🛠️ Quick Start

### Install Dependencies
```bash
pnpm install
```

### Run GQLoom Example
```bash
# Start development server (supports hot reload)
pnpm dev:gqloom

# Only print and generate schema.graphql
pnpm print:gqloom
```

## 📐 Comparison Dimensions Analysis

When evaluating GraphQL Schema building libraries, we mainly focus on the following 5 core technical dimensions. These dimensions directly affect developers' coding experience (DX), code maintainability, and runtime performance.

### 1. Architecture Pattern
Architecture pattern determines code organization and Schema building logic, and is the first factor to consider when selecting a library.
- **Definition**: How the library converts TypeScript code into GraphQL Schema.
  - **Decorator**: Uses classes and decorators to define types, relies on reflection metadata.
  - **Builder**: Uses functional API to explicitly build type definitions.
  - **Weaving**: Builds by combining independent Resolver and Schema definitions, usually combined with inference.
  - **Inference**: Directly analyzes TypeScript type definitions to generate Schema, pursuing zero configuration.
  - **Schema Building**: The process of assembling defined types and Resolvers into an executable GraphQL Schema instance. Different architecture patterns correspond to different building methods, such as `buildSchema()` (decorator), `builder.toSchema()` (builder), `weave()` (weaving), or static analysis tools (inference).

- **Scoring Points**:
  - **Dependency Complexity**:
    - ⭐️⭐️⭐️⭐️⭐️: **Minimal Dependencies**. Only depends on `graphql` standard library, zero runtime overhead, no additional third-party dependencies.
    - ⭐️⭐️⭐️⭐️: **Lightweight Dependencies**. Very few runtime dependencies (1-2), mainly for type enhancement or lightweight assistance.
    - ⭐️⭐️⭐️: **Medium Dependencies**. Requires reflection library (`reflect-metadata`) or multiple validation libraries (`class-validator`, etc.).
    - ⭐️⭐️: **Heavy Dependencies**. Depends on many third-party libraries, even includes complete build compiler.
    - ⭐️: **Bloated Dependencies**. Forced bundling of large frameworks and tools (10+ runtime dependencies), severely increasing package size.
  
  - **Build Flow**:
    - ⭐️⭐️⭐️⭐️⭐️: **Write and Use Immediately**. Pure runtime building, no code generation (CodeGen) or specialized CLI build steps required.
    - ⭐️⭐️⭐️⭐️: **Lightweight Build**. Supports runtime, but usually recommends a simple type generation step for optimal TS experience.
    - ⭐️⭐️⭐️: **Explicit Build**. Must run CLI command to generate Schema files or type definitions before code can compile or run.
    - ⭐️⭐️: **Black Box Build**. Depends on proprietary compiler or complex code injection transformation, build process is opaque, difficult to debug.
    - ⭐️: **Closed Build**. Strongly bound to proprietary CLI and build tools, cannot integrate into existing bundlers (such as Vite, Rspack).
  
  - **Config & Language Magic**:
    - ⭐️⭐️⭐️⭐️⭐️: **Zero Magic**. Does not depend on decorators, reflection metadata, code generation, or non-standard TS syntax, fully complies with native TS best practices.
    - ⭐️⭐️⭐️⭐️: **Minimal Configuration**. Only requires a small amount of intuitive configuration, mainly relies on TS's own type inference. May include optional code generation steps, but not mandatory.
    - ⭐️⭐️⭐️: **Feature Dependency**. Must enable TS experimental features (such as `experimentalDecorators`) and manually configure reflection environment, or strongly recommends using code generation for complete type safety.
    - ⭐️⭐️: **Deep Injection**. Large-scale code modification or metadata injection through compiler plugins, or must use code generation to work properly.
    - ⭐️: **Strong Magic**. Forced use of custom transformation logic, users completely lose control over the final generated Schema.

  - **Ecosystem Integration**:
    - ⭐️⭐️⭐️⭐️⭐️: **Fully Neutral**. Supports standard `npm install`, can freely combine with any Web framework and bundler.
    - ⭐️⭐️⭐️⭐️: **Good Integration**. Standard installation process, excellent adaptability to mainstream GraphQL Server and bundlers.
    - ⭐️⭐️⭐️: **Environment Sensitive**. Although installable, has special requirements for runtime environment (such as must configure reflection environment or decorators).
    - ⭐️⭐️: **Installation Limited**. Can only create projects through official templates, cannot directly install into existing projects.
    - ⭐️: **Strong Framework Binding**. Forced binding to specific Web framework (such as Hono), cannot flexibly change underlying driver or integrate into other ecosystems.

### 2. Type Definition
Type definition is the core of Schema building, determining the depth and efficiency of TypeScript type to GraphQL type mapping.

#### 🎯 Scoring Points

**Single Source of Truth Implementation**
*   **⭐️⭐️⭐️⭐️⭐️**: Ultimate Unity. Generate TypeScript types, runtime validation logic (such as Zod/Valibot), and GraphQL Schema from a single definition, completely eliminating synchronization costs.
*   **⭐️⭐️⭐️⭐️**: Deep Inference. Core definition is the Schema, the other side (TS or Schema) is automatically extracted through type tools or JSDoc, requiring minimal auxiliary configuration.
*   **⭐️⭐️⭐️**: Logical Association. TS types and Schema definitions are bound through decorators and other methods, although there is slight duplication, type linkage can be maintained.
*   **⭐️⭐️**: Weak Synchronization. Depends on code generation (Code-Gen) to synchronize types between physical files, requires running build command after modification to update.
*   **⭐️**: Completely Manual. TS types and GraphQL definitions are unaware of each other, require manual maintenance of two sets of definitions, easily inconsistent.

**Enum & String Union Support**
*   **⭐️⭐️⭐️⭐️⭐️**: Zero Configuration Reuse. Directly supports TypeScript native `enum` or string union types (`'A' | 'B'`), no manual registration required.
*   **⭐️⭐️⭐️⭐️**: Lightweight Mapping. Supports mapping through simple API with `as const` arrays or objects, no need to redefine member names.
*   **⭐️⭐️⭐️**: Explicit Registration. Requires calling specific functions (such as `registerEnumType`) for manual registration, but maintains type safety in inference.
*   **⭐️⭐️**: Duplicate Declaration. Requires completely rewriting enum members in library-provided DSL, causing string literals to be hardcoded in multiple places.
*   **⭐️**: Mapping Missing. Cannot effectively map TS enums, requires manual handling of raw value to GraphQL enum mapping logic.

**Interface Inheritance & Union Type Experience**
*   **⭐️⭐️⭐️⭐️⭐️**: Fully Automatic Resolution. Interface fields automatically inherited; Union types automatically handle `__typename` (such as through discriminated unions or field feature recognition).
*   **⭐️⭐️⭐️⭐️**: Smart Inheritance. Supports field inheritance, but Union type resolution may require simple metadata tags or explicit `__typename` literals.
*   **⭐️⭐️⭐️**: Logical Resolution. Supports abstract types, but requires manual implementation of `resolveType` function, and has specific dependencies on raw data structure.
*   **⭐️⭐️**: Manual Completion. Must manually repeat declaration of all common fields when implementing interfaces; Union members need to manually return type names in Resolver.
*   **⭐️**: Basic Simulation. Lacks native encapsulation of abstract types, can only simulate interface or union behavior through ordinary objects and procedural logic.

**Type Inference Strength & Explicit Declaration Balance**
*   **⭐️⭐️⭐️⭐️⭐️**: Native Analysis. Directly analyzes TS source code (classes/interfaces), automatically infers base types, arrays, and nullability, almost no explicit declaration burden.
*   **⭐️⭐️⭐️⭐️**: Strong Inference. Builder API can automatically derive most types, only requires minimal explicit annotations for circular references or complex nesting.
*   **⭐️⭐️⭐️**: On-Demand Annotation. Base types can be inferred, but arrays, Promise, and lazy loading types frequently require `() => Type` syntax.
*   **⭐️⭐️**: Strong Binding. Every field, parameter, and return value must manually specify types through decorators or generics, inference capability is limited.
*   **⭐️**: Zero Inference. Completely depends on manual explicit mapping, developers must manually configure corresponding GraphQL type metadata for every piece of code.

### 3. Resolver Definition & Input Validation
Resolvers are the core of business logic. Excellent resolver definitions should automatically infer input parameter types, provide strongly typed return value validation, and elegantly integrate validation logic.

#### 3.1 Developer Experience (Code Conciseness)
Evaluate the code volume and template code volume required to define a complete domain module (including Query, Mutation, Field Resolver).

- **⭐⭐⭐⭐⭐**: Extremely concise code, almost no boilerplate, type definition and Resolver unified, chain API intuitive
- **⭐⭐⭐⭐**: Concise code, moderate template code volume, requires few decorators, configuration, or comments, code structure clear
- **⭐⭐⭐**: Moderate code volume, more template code, requires additional API wrapping
- **⭐⭐**: Verbose code, large amount of template code, requires decorators or configuration objects
- **⭐**: Very verbose code, large amount of repetitive template code

#### 3.2 Modular Design (Domain-Driven Development Support)
Evaluate whether the library supports organizing code by domain modules, and whether modularization is enforced.

- **⭐⭐⭐⭐⭐**: Naturally domain modular, enforces organization by domain, type definitions, Query, Mutation, Field Resolver are all in the same module, creating clear module boundaries through domain boundaries (such as Resolver classes or objects)
- **⭐⭐⭐⭐**: Supports domain modularization, provides modular API, but does not enforce modularization, can split files by domain, requires developers to consciously comply
- **⛔**: No modular consideration, completely isolates interfaces by operation type, completely organizes by operation type (Query/Mutation), requires manual merging of arrays or objects, easily leads to coupled giant files

#### 3.3 Parameter Definition & Type Inference
Evaluate the conciseness of parameter definition and completeness of type inference.

- **⭐⭐⭐⭐⭐**: Parameter types completely automatically inferred, no manual declaration required, IDE hints complete. Supports chain API or function parameter automatic inference, types automatically derived from Schema definition
- **⭐⭐⭐⭐**: Parameter types mostly automatically inferred, few require explicit declaration. Automatically derived through Builder API or type inference tools, requires minimal type annotations
- **⭐⭐⭐**: Parameter types require partial explicit declaration, but type safe. Requires manual type declaration, but TypeScript can understand parameter types
- **⭐⭐**: Parameter types require extensive explicit declaration, type inference limited. Every parameter requires decorators or configuration objects to explicitly declare types
- **⛔**: No type inference, requires completely manual declaration of all parameter types

#### 3.4 Input Validation Mechanism
Evaluate format validation and custom validation capabilities, and the degree of integration between validation and Schema definition.

- **⭐⭐⭐⭐⭐**: Declarative validation, validation logic completely unified with Schema definition, supports format validation (such as `z.email()`) and custom validation (such as `.refine()`), automatic validation, no additional plugins required
- **⭐⭐⭐⭐**: Supports declarative validation, but requires additional configuration. Uses decorators or plugins to provide validation functionality, requires parameter type classes or plugin configuration
- **⭐⭐⭐**: Supports validation, but requires manual writing of validation logic. Requires manual calling of validation functions, validation code mixed with business logic
- **⭐⭐**: No built-in validation, requires completely manual implementation. All validation logic must be manually written in Resolver, validation code repetitive
- **⛔**: No validation support, cannot perform input validation

#### 3.5 Batch Loading (DataLoader) Integration
Evaluate the degree of support for batch loading functionality and boilerplate code volume.

- **⭐⭐⭐⭐⭐**: Native built-in support, seamless dataloader calls, almost no boilerplate code. Only need to define `.load()` or `load` function, no need to configure Context or create DataLoader instances
- **⭐⭐⭐⭐**: Supports dataloader through plugins or other forms, requires some boilerplate code. Requires installing plugins and configuration, uses declarative API (such as `t.loadableGroup()`)
- **⛔**: No built-in dataloader support provided, requires large amount of context boilerplate code and dataloader boilerplate code. Requires manual creation of DataLoader instances, defining Context types, configuring Context injection, lots of boilerplate code

### 4. Built-in Features
Built-in features determine the library's "out-of-the-box" capability when dealing with complex business scenarios.
- **Definition**: Whether the library natively supports common patterns and advanced features in GraphQL development, reducing boilerplate code. Features should not be simple accumulation, but should be deeply integrated with core API and maintain type safety. Modern libraries should provide features through flexible plugin systems (Plugin System), which can avoid core library bloat while significantly reducing developers' workload of writing repetitive logic.

#### 🎯 Scoring Points

**Directive Support**
- **✅ Built-in Support**: Native support for defining and using GraphQL Directives, supports federation architecture, API concise and type safe.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement Directives functionality through official plugins, community plugins, or manual implementation, requires additional configuration and boilerplate code.
- **⛔ Cannot Implement**: Completely does not support Directives definition, cannot implement Directives functionality through any means.

**Extension Support**
- **✅ Built-in Support**: Native support for defining and using GraphQL Extensions, can declare query complexity, execution time, and other extension information, API intuitive.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement similar functionality through plugins or manual extension of Context, requires additional configuration.
- **⛔ Cannot Implement**: Completely does not support Extensions, cannot extend GraphQL execution context.

**Batch Loading (DataLoader) Integration**
- **✅ Built-in Support**: Native built-in DataLoader support, seamless calls, almost no boilerplate code. Only need to define `.load()` or `load` function, no need to configure Context or create DataLoader instances.
- **⚠️ Plugin/Additional Implementation**: Supports dataloader through plugins or other forms, requires some boilerplate code. Requires installing plugins and configuration, uses declarative API (such as `t.loadableGroup()`).
- **⛔ Cannot Implement**: No built-in dataloader support provided, and cannot implement through plugins, requires large amount of context boilerplate code and dataloader boilerplate code.

**Custom Scalars**
- **✅ Built-in Support**: Built-in common scalar types (such as `DateTime`, `JSON`, `BigInt`, `Date`, etc.), defining new scalar types is simple, API intuitive and type safe.
- **⚠️ Plugin/Additional Implementation**: Not built-in common scalars, but can implement custom scalars through plugins or manual definition, requires additional configuration and boilerplate code.
- **⛔ Cannot Implement**: Completely does not support custom scalar types, can only use GraphQL standard scalar types.

**Subscription**
- **✅ Built-in Support**: Native support for GraphQL Subscriptions, supports real-time data push, good underlying transport protocol compatibility (WebSocket, SSE, etc.), API concise.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement subscription functionality through plugins or integrating third-party libraries (such as `graphql-subscriptions`), requires additional configuration.
- **⛔ Cannot Implement**: Completely does not support Subscriptions, cannot implement real-time data push functionality.

**Context Injection**
- **✅ Built-in Support**: Native support for injecting context in Resolver, context type inference complete, IDE hints good, no manual type declaration required.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement context injection through plugins or manual extension, requires manual definition of Context type and injection logic.
- **⛔ Cannot Implement**: Completely does not support context injection, cannot access request-level context information in Resolver.

**Middleware**
- **✅ Built-in Support**: Native support for injecting middleware logic before and after Resolver execution (such as logging, permission checks, performance monitoring), API concise, supports chain calls.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement middleware functionality through plugins or manually wrapping Resolver, requires additional configuration and boilerplate code.
- **⛔ Cannot Implement**: Completely does not support middleware mechanism, cannot inject logic before and after Resolver execution.

**Query Complexity Analysis**
- **✅ Built-in Support**: Native support for query complexity calculation and analysis, can automatically or declaratively calculate query complexity, prevent complex query attacks.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement complexity analysis through plugins or manual implementation, requires additional configuration and custom logic.
- **⛔ Cannot Implement**: Completely does not support query complexity analysis, cannot prevent complex query attacks.

**Depth Limiting**
- **✅ Built-in Support**: Native support for query depth limiting, can automatically limit query nesting depth, prevent depth query attacks.
- **⚠️ Plugin/Additional Implementation**: Not built-in, but can implement depth limiting through plugins or manual implementation, requires additional configuration.
- **⛔ Cannot Implement**: Completely does not support depth limiting, cannot prevent depth query attacks.

### 5. Ecosystem Integration
Ecosystem integration measures the library's collaboration capability within the entire TypeScript toolchain, and is key to determining long-term project maintainability.
- **Definition**: The library's interoperability with other commonly used tools in the TypeScript ecosystem. Excellent integration should eliminate "glue code" and build end-to-end type-safe chains. It should be lightweight and non-intrusive, allowing developers to freely combine best practice tool stacks according to business needs.

#### 🎯 Scoring Points

**ORM Integration Depth**
- **⭐️⭐️⭐️⭐️⭐️**: **Deep Integration**. Provides official plugins to directly reuse ORM model definitions (such as Prisma, Drizzle, TypeORM), automatically generates efficient database queries, types completely synchronized, zero boilerplate code.
- **⭐️⭐️⭐️⭐️**: **Good Integration**. Provides official or community plugin support for mainstream ORMs, can reuse model definitions, but requires minimal configuration, type synchronization good.
- **⭐️⭐️⭐️**: **Basic Integration**. Supports ORM integration through plugins or manual methods, can reuse part of model definitions, but requires more configuration and boilerplate code.
- **⭐️⭐️**: **Weak Integration**. Can only integrate ORM through manual methods, requires large amount of glue code, type synchronization needs manual maintenance.
- **⭐️**: **No Integration**. Completely does not support ORM integration, must manually write all database query logic.

**Validation Library Integration**
- **⭐️⭐️⭐️⭐️⭐️**: **Seamless Integration**. Native support for mainstream validation libraries (Zod, Valibot, Yup, etc.), validation logic completely unified with Schema definition, automatically derives types from validation rules, zero configuration.
- **⭐️⭐️⭐️⭐️**: **Deep Integration**. Supports mainstream validation libraries through official plugins, validation logic deeply bound with Schema definition, type inference good, requires minimal configuration.
- **⭐️⭐️⭐️**: **Basic Integration**. Supports validation library integration through plugins, can use validation rules, but requires manual type synchronization, requires moderate configuration.
- **⭐️⭐️**: **Weak Integration**. Can only use validation libraries through manual methods, validation logic separated from Schema definition, requires large amount of boilerplate code.
- **⭐️**: **No Integration**. Completely does not support validation library integration, must manually write all validation logic.

**GraphQL Server Compatibility**
- **⭐️⭐️⭐️⭐️⭐️**: **Fully Compatible**. Fully compatible with all mainstream GraphQL Servers (Apollo Server, GraphQL Yoga, Envelop, Hono, etc.), provides official adapters, zero configuration to use.
- **⭐️⭐️⭐️⭐️**: **Standard Compatible**. Compatible with standard GraphQL.js, can integrate into mainstream Servers, but requires manual adaptation, requires moderate configuration.
- **⭐️**: **Bound to Specific Server**. Forced binding to specific GraphQL Server, cannot integrate into other Servers.

**Toolchain Integration**
- **⭐️⭐️⭐️⭐️⭐️**: **Fully Flexible**. Optional TypeScript or direct use of JavaScript, can run in browser, node, bun, deno, Cloudflare Workers, and other environments, can flexibly configure rspack, webpack, vite, etc.
- **⭐️⭐️⭐️⭐️**: **Good Compatibility**. Supports TypeScript and JavaScript, can run in mainstream runtimes (node, bun, deno), supports mainstream build tools (webpack, vite), but may not support browser direct execution or certain edge environments.
- **⭐️⭐️⭐️**: **Basic Support**. Mainly supports TypeScript, can run in some mainstream runtimes, supports some build tools, but requires specific configuration, limited flexibility.
- **⭐️⭐️**: **Limited Support**. Only supports specific runtime environments or build tools, complex configuration, requires large amount of manual adaptation, poor flexibility.
- **⭐️**: **Strong Binding**. Strongly bound to specific framework, build process rigid, cannot run in browser and other environments.