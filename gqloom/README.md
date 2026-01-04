# GQLoom Evaluation Report (January 2026)

> This report is generated based on actual business code (`typescript-graphql-schemas/gqloom/src`) and official examples (`@gqloom/examples`).

## 📋 Basic Information
| Item              | Content                               |
| :---------------- | :------------------------------------ |
| **Version**       | 0.15.0                                |
| **GitHub**        | https://github.com/modevol-com/gqloom |
| **Docs**          | https://gqloom.dev                    |
| **First Commit**  | 2024-03-14                            |
| **Latest Commit** | 2026-01-02                            |

## 📊 Overall Score
| Dimension                     | Score (1-5) | Brief Review                                                                                                |
| :---------------------------- | :---------- | :---------------------------------------------------------------------------------------------------------- |
| **1. Architecture**           | **5.0**     | Minimal dependencies, pure runtime build, zero magic, fully neutral                                         |
| **2. Type Definition**        | **5.0**     | Deep inference, zero-config enums, smart inheritance, powerful type inference                               |
| **3. Resolvers & Validation** | **5.0**     | Minimal code, chainable API, declarative validation, native DataLoader                                      |
| **4. Built-in Features**      | **4.0**     | Core features complete, native Context/Middleware/DataLoader support                                        |
| **5. Ecosystem Integration**  | **5.0**     | Deep ORM integration, seamless validation library integration, full Server compatibility, framework support |

---

## 1. Architecture

### Architecture Overview

GQLoom adopts the **Weaving pattern**, combining Resolver definitions and runtime types (such as Zod Schema) into a GraphQL Schema at runtime through the `weave()` function. The core design philosophy is "zero magic": no decorators, reflection metadata, or code generation, running entirely on native TypeScript and JavaScript.

**Core Implementation Locations**:
- `packages/core/src/schema/schema-loom.ts`: `GraphQLSchemaLoom` class and `weave()` function
- `packages/core/src/resolver/resolver.ts`: Resolver factory functions and chainable API
- `packages/zod/src/index.ts`: Zod Weaver implementation, converting Zod Schema to GraphQL types

### 1.1 Dependency Complexity

**Score: 5.0**

**Core Dependency Analysis**:
- `@gqloom/core`'s `package.json` shows:
  - **Peer Dependency**: Only `graphql >= 16.8.0` (standard GraphQL library)
  - **Dev Dependency**: `@standard-schema/spec` (only for type definitions, not used at runtime)
  - **Runtime Dependencies**: Zero additional dependencies

**Evidence**:
```json
// packages/core/package.json
"peerDependencies": {
  "graphql": ">= 16.8.0"
},
"devDependencies": {
  "@standard-schema/spec": "1.1.0"
}
```

**Conclusion**: GQLoom achieves minimal dependency design, depending only on the GraphQL standard library, with zero runtime overhead and no additional third-party dependencies.

### 1.2 Build Flow

**Score: 5.0**

**Build Method**:
- Uses `tsdown` for compilation (`packages/core/tsdown.config.ts`), supporting both ESM and CJS format output
- **Pure Runtime Build**: No code generation (CodeGen) or dedicated CLI build steps required
- Schema generation is completed entirely at runtime, directly generating `GraphQLSchema` instances through the `weave()` function

**Actual Usage Evidence**:
```typescript
// src/schema.ts
export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)

// src/print.ts - Only for printing Schema, not a required step
const sdl = printSchema(lexicographicSortSchema(schema))
```

**Conclusion**: Write and use immediately, pure runtime build, no code generation or dedicated build steps required. Developers can directly call `weave()` in code to generate Schema, or optionally use `printSchema()` to generate SDL files.

### 1.3 Config & Language Magic

**Score: 5.0**

**Technical Implementation**:
- **No Decorators**: Confirmed through grep search, no `decorator`, `reflect`, `metadata` keywords in core code
- **No Reflection Metadata**: Completely based on native TypeScript type system and object metadata
- **Metadata Storage**: Uses Symbol and object properties (`~meta`) to store Resolver metadata

**Core Implementation Evidence**:
```typescript
// packages/core/src/resolver/resolver.ts
export const resolver: ResolverFactory = Object.assign(
  ((operations, options) => new ChainResolver(operations, options)) as ResolverFactory,
  { /* ... */ }
)

// Using Symbol to identify Resolver
export const IS_RESOLVER = Symbol.for("gqloom.resolver")
export const WEAVER_CONFIG = Symbol.for("gqloom.weaver_config")
```

**Actual Usage**:
```typescript
// src/resolvers/user.ts - Fully functional API, no decorators
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order))).load(/* ... */),
  users: query(z.array(User), () => Array.from(userMap.values())),
  // ...
})
```

**Conclusion**: Zero magic, no dependency on decorators, reflection metadata, or non-standard TS syntax, fully compliant with native TypeScript best practices.

### 1.4 Ecosystem Integration

**Score: 5.0**

**Integration Method**:
- **Standard npm Installation**: Use via `npm install @gqloom/core @gqloom/zod`
- **Plugin System**: Supports multiple validation libraries and ORMs through Weaver interface (`SchemaWeaver`)
- **Web Framework Compatibility**: Official examples (`examples/adapters`) demonstrate integration with Apollo Server, GraphQL Yoga, Mercurius, Hono

**Official Adapter Examples**:
```typescript
// examples/adapters/src/yoga.ts
import { createYoga } from "graphql-yoga"
const schema = weave(helloResolver)
const yoga = createYoga({ schema })
```

**Plugin Ecosystem**:
- Validation Library Integration: `@gqloom/zod`, `@gqloom/valibot`, `@gqloom/yup`
- ORM Integration: `@gqloom/prisma`, `@gqloom/drizzle`, `@gqloom/mikro-orm`
- Other Features: `@gqloom/federation`, `@gqloom/effect`, `@gqloom/json`

**Conclusion**: Fully neutral, supports standard `npm install`, can freely combine with any Web framework and bundler. Flexible ecosystem integration through Weaver plugin system.

### Architecture Summary

| Evaluation Item             | Score   | Description                                                       |
| :-------------------------- | :------ | :---------------------------------------------------------------- |
| **Dependency Complexity**   | **5.0** | Only depends on `graphql` standard library, zero runtime overhead |
| **Build Flow**              | **5.0** | Pure runtime build, no code generation                            |
| **Config & Language Magic** | **5.0** | Zero magic, no decorators, no reflection metadata                 |
| **Ecosystem Integration**   | **5.0** | Fully neutral, standard npm install, supports multiple frameworks |

**Overall Score: 5.0**

GQLoom's architecture design embodies the "minimalism" philosophy: combining Resolvers and type definitions at runtime through the Weaving pattern, completely avoiding decorators and code generation, achieving a zero-magic, zero-dependency lightweight GraphQL Schema construction solution.

## 2. Type Definition

### Type Definition Overview

GQLoom adopts the design philosophy of **runtime types as Single Source of Truth (SSOT)**. Zod Schema serves as both runtime validation rules and GraphQL Schema type definitions, while automatically deriving TypeScript types through TypeScript's `z.infer`. This design achieves the ultimate unity of "one definition, three purposes".

**Core Implementation Locations**:
- `packages/zod/src/index.ts`: Zod Weaver implementation, converting Zod Schema to GraphQL types
- `packages/core/src/resolver/input.ts`: Input type inference (`InferInputI`, `StandardSchemaV1.InferInput`)
- `packages/zod/src/utils.ts`: Type conversion utility functions, handling complex scenarios like interfaces and union types

### 2.1 Single Source of Truth (SSOT) Implementation

**Score: 5.0**

**Implementation Method**:
- **Zod Schema as Single Source**: Define once, used simultaneously for TypeScript types, runtime validation, and GraphQL Schema
- **TypeScript Types**: Automatically derived through `z.infer<typeof Schema>`
- **GraphQL Schema**: Automatically generated from Zod Schema at runtime through Weaver
- **Validation Logic**: Unified through `StandardSchemaV1` interface, validation logic comes from Zod Schema itself

**Actual Usage Evidence**:
```typescript
// src/resolvers/menu.ts
export const Food = z.object({
  __typename: z.literal('Food').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// TypeScript types automatically inferred
export const menuMap = new Map<number, z.infer<typeof MenuItem>>(/* ... */)

// GraphQL Schema automatically generated (through weave)
export const schema = weave(ZodWeaver, zodWeaverConfig, menuResolver)
```

**Unified Validation Logic**:
```typescript
// packages/core/src/resolver/input.ts
// Input validation directly uses Schema's validate method
return inputSchema["~standard"].validate(input)
```

**Shortcomings**:
- Need to manually define `__typename` field in Schema for Union type discrimination
- Interface inheritance requires explicit call to `.register(asObjectType, { interfaces: [Food] })`, cannot be fully automatically inferred

**Conclusion**: Deep inference. Core definition (Zod Schema) is the Schema, TypeScript types and GraphQL Schema are automatically extracted through type utilities, requiring only minimal auxiliary configuration (such as interface registration).

### 2.2 Enum & String Union Support

**Score: 5.0**

**Implementation Method**:
- **Direct Zod Enum Support**: `z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])` automatically converts to GraphQL Enum
- **Zero-Config Reuse**: No manual registration, no need to redefine member names
- **String Literal Support**: Supports string literal types through `z.literal()`

**Actual Usage Evidence**:
```typescript
// src/resolvers/menu.ts
const SugarLevel = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])

// src/resolvers/order.ts
export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])

// Direct use, no additional configuration
export const Coffee = Food.extend({
  sugarLevel: SugarLevel,  // Automatically converts to GraphQL Enum
  // ...
})
```

**Core Implementation**:
```typescript
// packages/zod/src/index.ts
if (isZodEnum(schema)) {
  const values: GraphQLEnumValueConfigMap = {}
  Object.entries(schema._zod.def.entries).forEach(([key, value]) => {
    values[key] = { value, ...valuesConfig?.[key] }
  })
  return new GraphQLEnumType({ name, values, ...enumConfig })
}
```

**Conclusion**: Zero-config reuse. Directly supports TypeScript native `enum` or string union types (through `z.enum()`), no manual registration required.

### 2.3 Interface Inheritance & Union Type Experience

**Score: 4.5**

**Interface Inheritance Implementation**:
- **Automatic Field Inheritance**: Subtypes defined through `Food.extend()` automatically inherit all fields from parent type
- **Explicit Interface Registration**: Need to call `.register(asObjectType, { interfaces: [Food] })` to declare interface relationship
- **Interface Type Conversion**: Converts Zod Object to GraphQL Interface through `ZodWeaver.ensureInterfaceType()`

**Actual Usage Evidence**:
```typescript
// src/resolvers/menu.ts
export const Food = z.object({
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// Fields automatically inherited, no need to redefine id, name, price
export const Coffee = Food.extend({
  __typename: z.literal('Coffee'),
  sugarLevel: SugarLevel,
  origin: z.string(),
}).register(asObjectType, { interfaces: [Food] })  // Explicitly declare interface relationship
```

**Union Type Implementation**:
- **Direct `z.union()` Support**: `z.union([Coffee, Dessert])` automatically converts to GraphQL Union
- **Discriminated Union Support**: Supports definition through `z.discriminatedUnion()`, automatically handles `__typename` field
- **Type Resolution**: Automatically resolves type based on `__typename` field through `resolveTypeByDiscriminatedUnion()` function

**Actual Usage Evidence**:
```typescript
// src/resolvers/menu.ts
export const MenuItem = z.union([Coffee, Dessert])  // Direct use, automatic conversion

// Need to manually return __typename in Resolver
.resolve(({ name, price, sugarLevel, origin }) => {
  const newItem = { id, name, price, sugarLevel, origin, __typename: 'Coffee' as const }
  return newItem
})
```

**Core Implementation**:
```typescript
// packages/zod/src/index.ts
if (isZodUnion(schema)) {
  return new GraphQLUnionType({
    resolveType: isZodDiscriminatedUnion(schema)
      ? resolveTypeByDiscriminatedUnion(schema)  // Automatically handles Discriminated Union
      : undefined,
    types,
    name,
  })
}
```

**Shortcomings**:
- Need to manually define `__typename` field in Schema (though it can be set to `nullish()`)
- Interface inheritance requires explicit registration, cannot be fully automatically inferred

**Conclusion**: Smart inheritance. Supports field inheritance, Union type resolution automatically handled through Discriminated Union, but requires explicit interface registration and `__typename` field definition.

### 2.4 Type Inference Strength & Explicit Declaration Balance

**Score: 5.0**

**Input Type Inference**:
- **Fully Automatic Inference**: Automatically derives input parameter types through `InferInputI` and `StandardSchemaV1.InferInput`
- **Chainable API Support**: Types in `.input({ id: z.int() })` automatically inferred, IDE hints complete

**Output Type Inference**:
- **Fully Automatic Inference**: Automatically derives return value types through `StandardSchemaV1.InferOutput`
- **Resolver Return Value Types**: Automatically inferred from Schema, no manual declaration needed

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts
user: query(User)  // Output type automatically inferred as z.infer<typeof User>
  .input({ id: z.int() })  // Input type automatically inferred as { id: number }
  .resolve(({ id }) => {  // id's type automatically inferred as number
    const user = userMap.get(id)
    return user  // Return value type automatically inferred
  })
```

**Basic Type Inference**:
- **Scalar Types**: `z.string()` → `GraphQLString`, `z.int()` → `GraphQLInt`, automatically inferred
- **Array Types**: `z.array(Type)` → `GraphQLList`, automatically inferred
- **Nullability**: `z.nullish()`, `z.optional()` automatically handle nullability

**Circular Reference Handling**:
- **Need to Explicitly Use `z.lazy()`**: Need to manually wrap when handling circular references

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts
orders: field(z.array(z.lazy(() => Order)))  // Need to explicitly use z.lazy()
  .load((users) => { /* ... */ })
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/input.ts
export type InferInputI<TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void> =
  TInput extends GraphQLSilk
    ? StandardSchemaV1.InferInput<TInput>  // Automatically infer input type
    : TInput extends Record<string, GraphQLSilk>
      ? { [K in keyof TInput]: StandardSchemaV1.InferInput<TInput[K]> }
      : void
```

**Shortcomings**:
- Circular references need to explicitly use `z.lazy()`
- Complex nested types may require minimal type annotations

**Conclusion**: Powerful inference. Builder API can automatically derive most types, requiring only minimal explicit annotations (such as `z.lazy()`) for circular references or complex nesting.

### Type Definition Summary

| Evaluation Item                   | Score   | Description                                                                                                                                   |
| :-------------------------------- | :------ | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single Source of Truth (SSOT)** | **5.0** | Deep inference, Zod Schema is Schema, TypeScript and GraphQL types automatically extracted                                                    |
| **Enum & String Union Support**   | **5.0** | Zero-config reuse, directly supports `z.enum()`, no manual registration                                                                       |
| **Interface Inheritance & Union** | **4.5** | Smart inheritance, fields automatically inherited, Union automatically handled, but requires explicit interface registration and `__typename` |
| **Type Inference Strength**       | **5.0** | Powerful inference, basic types, arrays, nullability automatically inferred, circular references need `z.lazy()`                              |

**Overall Score: 5.0**

GQLoom's type definition system implements the "one definition, three purposes" design philosophy, achieving unity of Zod Schema, TypeScript types, and GraphQL Schema through deep inference. Although minimal explicit configuration is required for interface inheritance and circular reference handling, overall type inference capability is powerful with excellent developer experience.

## 3. Resolvers & Validation

### Resolvers & Validation Overview

GQLoom's resolver system adopts a **chainable API design**, creating type-safe Resolvers through factory functions like `resolver()`, `query()`, `mutation()`, `field()`. Validation logic is completely unified with Schema definitions, achieving declarative validation through Zod Schema validation methods (such as `.refine()`, `.email()`). DataLoader support is natively integrated through `.load()` method with almost no boilerplate code.

**Core Implementation Locations**:
- `packages/core/src/resolver/resolver.ts`: Resolver factory functions and chainable API
- `packages/core/src/resolver/resolver-chain-factory.ts`: Chainable factory class, providing `.input()`, `.resolve()`, `.load()` and other methods
- `packages/core/src/resolver/input.ts`: Input validation and type inference
- `packages/core/src/utils/loader.ts`: Built-in DataLoader implementation

### 3.1 Developer Experience (Code Conciseness)

**Score: 5.0**

**Code Characteristics**:
- **Chainable API**: Chainable configuration through methods like `.input()`, `.resolve()`, `.use()`
- **Type Definition & Resolver Unified**: Schema definition is Resolver definition, no separation needed
- **Almost No Boilerplate**: No decorators, configuration objects, or additional type declarations

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts - Extremely concise code, chainable API intuitive
export const userResolver = resolver.of(User, {
  users: query(z.array(User), () => Array.from(userMap.values())),
  
  user: query(User)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    }),
  
  createUser: mutation(User)
    .input({
      name: z.string(),
      email: z.email(),
    })
    .resolve(({ name, email }) => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    }),
})
```

**Code Volume Comparison**:
- Complete User module (including Query, Mutation, Field Resolver) requires only about 70 lines of code
- No decorators, no configuration objects, no additional type declaration files

**Conclusion**: Extremely concise code, almost no boilerplate, type definition and Resolver unified, chainable API intuitive.

### 3.2 Modular Design (Domain-Driven Development Support)

**Score: 5.0**

**Modular Implementation**:
- **Organized by Domain**: Create domain module boundaries through `resolver()` and `resolver.of()`
- **File Splitting**: Can split files by domain (`user.ts`, `menu.ts`, `order.ts`)
- **Module Merging**: Merge multiple Resolver modules through `weave()` function

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts - User domain module
export const userResolver = resolver.of(User, {
  orders: field(/* ... */),
  users: query(/* ... */),
  user: query(/* ... */),
  createUser: mutation(/* ... */),
  // ...
})

// src/resolvers/menu.ts - Menu domain module
export const menuResolver = resolver({
  menu: query(/* ... */),
  menuItem: query(/* ... */),
  createCoffee: mutation(/* ... */),
  // ...
})

// src/schema.ts - Module merging
export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
```

**Module Boundaries**:
- `resolver.of(ParentType, fields)`: Creates Field Resolver for object type, includes Query, Mutation, and Field Resolver
- `resolver(operations)`: Creates independent Query/Mutation operations
- Each Resolver is an independent module, can be tested and maintained separately
- All content (type definitions, Query, Mutation, Field Resolver) are in the same unified object

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts - All content in one unified object
export const userResolver = resolver.of(User, {
  orders: field(...),           // Field Resolver
  users: query(...),             // Query
  user: query(...),              // Query
  createUser: mutation(...),     // Mutation
  updateUser: mutation(...),     // Mutation
  deleteUser: mutation(...),     // Mutation
})
```

**Analysis**:
- ✅ Naturally domain-modularized, enforces organization by domain
- ✅ Type definitions, Query, Mutation, Field Resolver all in the same module
- ✅ Creates unified module boundaries through `resolver.of()`
- ✅ All content in one unified object, module boundaries clear

**Conclusion**: Naturally domain-modularized, enforces organization by domain, type definitions, Query, Mutation, Field Resolver all in the same module, creating clear module boundaries through domain boundaries (`resolver.of()` object).

### 3.3 Parameter Definition & Type Inference

**Score: 5.0**

**Type Inference Implementation**:
- **Parameter Types Fully Automatically Inferred**: Parameter types defined through `.input()` automatically inferred
- **Chainable API Type Inference**: Types returned by `.input()` automatically inferred to `.resolve()` function parameters
- **IDE Hints Complete**: TypeScript type system provides complete type hints

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts
user: query(User)
  .input({ id: z.int() })  // Input type automatically inferred as { id: number }
  .resolve(({ id }) => {   // id's type automatically inferred as number, IDE hints complete
    const user = userMap.get(id)
    return user
  })

// src/resolvers/order.ts
createOrder: mutation(Order)
  .input({
    userId: z.int().refine(/* ... */),
    items: z.array(z.int().refine(/* ... */)).min(1),
  })
  .resolve(({ userId, items }) => {  // Parameter types fully automatically inferred
    // userId: number, items: number[]
  })
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/input.ts
export type InferInputI<TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void> =
  TInput extends Record<string, GraphQLSilk>
    ? { [K in keyof TInput]: StandardSchemaV1.InferInput<TInput[K]> }
    : void
```

**Conclusion**: Parameter types fully automatically inferred, no manual declaration needed, IDE hints complete. Supports chainable API or function parameter automatic inference, types automatically derived from Schema definition.

### 3.4 Input Validation Mechanism

**Score: 5.0**

**Validation Implementation**:
- **Declarative Validation**: Validation logic completely unified with Schema definition, implemented through Zod Schema validation methods
- **Format Validation**: Supports format validation like `z.email()`, `z.string().min()`
- **Custom Validation**: Supports `.refine()` method to implement custom validation logic
- **Automatic Validation**: Input validation automatically performed before Resolver execution, no need to manually call validation function

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts
createUser: mutation(User)
  .input({
    name: z.string(),           // Format validation
    email: z.email(),           // Email format validation (automatic)
  })
  .resolve(({ name, email }) => {
    // Validation already completed automatically, directly use validated data here
  })

// src/resolvers/order.ts
createOrder: mutation(Order)
  .input({
    userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
    items: z
      .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
      .min(1, 'At least one item is required'),
  })
  .resolve(({ userId, items }) => {
    // All validation logic in Schema definition, automatically executed
  })
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/input.ts
export function parseInputValue<TSchema>(
  inputSchema: TSchema,
  input: any
): MayPromise<StandardSchemaV1.Result<InferInputO<TSchema>>> {
  if (isSilk(inputSchema)) {
    return inputSchema["~standard"].validate(input)  // Automatic validation
  }
  // ...
}
```

**Validation Error Handling**:
- Automatically throws `GraphQLError` on validation failure, includes validation error information
- Error information comes from Zod Schema validation rules

**Conclusion**: Declarative validation, validation logic completely unified with Schema definition, supports format validation (such as `z.email()`) and custom validation (such as `.refine()`), automatic validation, no additional plugins needed.

### 3.5 Batch Loading (DataLoader) Integration

**Score: 5.0**

**DataLoader Implementation**:
- **Native Built-in Support**: Seamlessly call DataLoader through `.load()` method
- **Almost No Boilerplate**: Only need to define `.load()` function, no need to configure Context or create DataLoader instances
- **Automatic Batching**: Automatically batches multiple requests, reducing database query count
- **Path-Aware**: Supports caching by GraphQL query path, avoiding duplicate queries

**Actual Usage Evidence**:
```typescript
// src/resolvers/user.ts
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order)))
    .load((users) => {  // Only need to define load function, no need to configure Context
      const userOrders = new Map<number, z.infer<typeof Order>[]>()
      for (const order of orderMap.values()) {
        const orders = userOrders.get(order.userId) ?? []
        orders.push(order)
        userOrders.set(order.userId, orders)
      }
      return users.map((user) => userOrders.get(user.id) ?? [])
    }),
})
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/resolver-chain-factory.ts
public load<TParent extends GraphQLSilk>(
  resolve: (
    parents: InferParent<TParent, TDependencies>[],
    input: InferInputO<TInput>,
    payloads: (ResolverPayload | undefined)[]
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>[]>
): Loom.Field<TParent, TOutput, TInput, TDependencies> {
  return createField(this.options.output, {
    resolve: (parent, input, payload) => {
      const loader = FieldLoader.getByPath(payload, resolve, /* ... */)
      return loader.load([parent, input, payload])  // Automatic batching
    },
  })
}
```

**DataLoader Features**:
- Automatic Batching: Merges multiple requests within the same tick into one batch query
- Automatic Caching: Same requests on the same query path automatically cached
- Path-Aware: Distinguishes different DataLoader instances based on GraphQL query path

**Conclusion**: Native built-in support, seamless dataloader calls, almost no boilerplate. Only need to define `.load()` or `load` function, no need to configure Context or create DataLoader instances.

### Resolvers & Validation Summary

| Evaluation Item                             | Score   | Description                                                                                                                             |
| :------------------------------------------ | :------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Developer Experience (Code Conciseness)** | **5.0** | Extremely concise code, almost no boilerplate, type definition and Resolver unified, chainable API intuitive                            |
| **Modular Design**                          | **5.0** | Naturally domain-modularized, enforces organization by domain, type definitions, Query, Mutation, Field Resolver all in the same module |
| **Parameter Definition & Type Inference**   | **5.0** | Parameter types fully automatically inferred, no manual declaration, IDE hints complete                                                 |
| **Input Validation Mechanism**              | **5.0** | Declarative validation, validation logic completely unified with Schema definition, supports format validation and custom validation    |
| **Batch Loading (DataLoader)**              | **5.0** | Native built-in support, seamless calls, almost no boilerplate                                                                          |

**Overall Score: 5.0**

GQLoom's resolver system achieves an extremely simple developer experience through chainable API, validation logic completely unified with Schema definition, DataLoader natively integrated, overall design excellent with extremely high development efficiency.

## 4. Built-in Features

### Built-in Features Overview

GQLoom provides rich built-in features through core API and plugin system, including Context injection, Middleware, DataLoader, Subscriptions, etc. Most features are deeply integrated with core API, maintaining type safety and reducing boilerplate code.

**Core Feature Locations**:
- `packages/core/src/context/`: Context injection and Memoization
- `packages/core/src/utils/middleware.ts`: Middleware system
- `packages/core/src/utils/loader.ts`: DataLoader implementation
- `packages/core/src/resolver/resolver.ts`: Subscription support
- `packages/core/src/schema/extensions.ts`: Extensions support

### Built-in Features Detailed Evaluation

| Feature                        | Support Status      | Description                                                                                                                                                                                                                                                           |
| :----------------------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Directives Support**         | ⚠️ Plugin/Additional | Not built-in support for custom Directives definition, but supports declaring Directives through Extensions (such as `extensions: { directives: { loom: { value: "Animal" } } }`), can support federation architecture Directives through `@gqloom/federation` plugin |
| **Extensions Support**         | ✅ Built-in          | Native support for GraphQL Extensions definition and usage, can declare query complexity, execution time and other extension information through `.extensions()` method, API intuitive                                                                                |
| **Batch Loading (DataLoader)** | ✅ Built-in          | Native built-in DataLoader support, seamlessly called through `.load()` method, almost no boilerplate (already detailed in Phase 4)                                                                                                                                   |
| **Custom Scalars**             | ✅ Built-in          | Supports custom scalar types through `presetGraphQLType` configuration, can integrate libraries like `graphql-scalars`, API intuitive and type-safe                                                                                                                   |
| **Subscriptions**              | ✅ Built-in          | Native support for GraphQL Subscriptions, supports real-time data push, underlying transport protocol good compatibility (WebSocket, SSE, etc.), API concise                                                                                                          |
| **Context Injection**          | ✅ Built-in          | Native support for injecting context in Resolver, provides `useContext()`, `createContext()`, `createMemoization()` and other APIs, type inference complete, IDE hints good                                                                                           |
| **Middleware**                 | ✅ Built-in          | Native support for injecting middleware logic before and after Resolver execution, chainable calls through `.use()` method, supports filtering by operation type, API concise                                                                                         |
| **Query Complexity Analysis**  | ⚠️ Plugin/Additional | Not built-in support, but can declare complexity through Extensions (such as `.extensions({ complexity: 10 })`), needs to work with libraries like `graphql-query-complexity`                                                                                         |
| **Depth Limiting**             | ⚠️ Plugin/Additional | Not built-in support, needs to be implemented through GraphQL Server middleware or plugins (such as `graphql-depth-limit`), GQLoom itself does not provide depth limiting functionality                                                                               |

### 4.1 Directives Support

**Score: ⚠️ Plugin/Additional Implementation**

**Implementation Method**:
- **No Built-in Custom Directives Definition**: GQLoom core does not provide API for defining custom Directives
- **Supports Declaring Directives through Extensions**: Can declare Directives information through `extensions` configuration
- **Federation Support**: Supports Apollo Federation Directives through `@gqloom/federation` plugin

**Actual Usage Evidence**:
```typescript
// packages/core/src/schema/extensions.ts
export interface GQLoomExtensions {
  directives?: DirectiveItem[] | DirectiveRecord
}

// Can declare Directives through extensions
extensions: {
  directives: { loom: { value: "Animal" } }
}
```

**Conclusion**: Not built-in support, but can achieve Directives functionality through official plugins (`@gqloom/federation`) or manual extension of Extensions, requires additional configuration.

### 4.2 Extensions Support

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Native Extensions Support**: Declare extension information through `.extensions()` method
- **Query Complexity Declaration Support**: Can declare field or operation complexity
- **Custom Extension Support**: Can declare arbitrary extension information

**Actual Usage Evidence**:
```typescript
// examples/query-complexity/src/zod.ts
posts: query(z.array(Post))
  .input({ limit: z.number().int().nullish().default(10) })
  .extensions({
    complexity: (args: ComplexityEstimatorArgs) => {
      return args.childComplexity * (args.args.limit ?? 10)
    },
  })
  .resolve(() => [])

// Field-level complexity declaration
description: z.string().register(asField, { complexity: 2 })
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/resolver-chain-factory.ts
public extensions(extensions: GraphQLFieldOptions["extensions"]): this {
  return this.clone({ extensions })
}
```

**Conclusion**: Native support for GraphQL Extensions definition and usage, can declare query complexity (complexity), execution time and other extension information, API intuitive.

### 4.3 Batch Loading (DataLoader) Integration

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Native Built-in Support**: Seamlessly call DataLoader through `.load()` method
- **Almost No Boilerplate**: No need to configure Context or create DataLoader instances
- **Automatic Batching and Caching**: Automatically batches multiple requests, supports path-aware caching

**Detailed Evaluation**: Already detailed in Phase 4, not repeated here.

**Conclusion**: Native built-in support, seamless dataloader calls, almost no boilerplate.

### 4.4 Custom Scalars

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Through `presetGraphQLType` Configuration**: Declare custom scalar type mappings in Weaver configuration
- **Supports `graphql-scalars`**: Can integrate common scalar type libraries
- **Type Safe**: Scalar types type-safe with Schema definition

**Actual Usage Evidence**:
```typescript
// src/schema.ts
export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})
```

**Core Implementation**:
```typescript
// packages/zod/src/index.ts
const preset = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
const presetType = preset?.presetGraphQLType?.(schema)
if (presetType) return presetType
```

**Conclusion**: Built-in support, can configure custom scalar types through `presetGraphQLType`, can integrate libraries like `graphql-scalars`, API intuitive and type-safe.

### 4.5 Subscriptions

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Native Subscriptions Support**: Create subscriptions through `subscription()` factory function
- **AsyncIterator Support**: Supports generator functions and AsyncIterator
- **PubSub Support**: Can integrate with `graphql-yoga`'s `createPubSub`

**Actual Usage Evidence**:
```typescript
// examples/subscriptions/src/zod.ts
const CountdownResolver = resolver({
  countdown: subscription(z.number())
    .input({ seconds: z.number().int() })
    .subscribe(async function* (data) {
      for (let i = data.seconds; i >= 0; i--) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        yield i
      }
    }),
})

const HelloResolver = resolver({
  listenGreeting: subscription(z.string())
    .subscribe(() => pubSub.subscribe("greeting"))
    .resolve((payload) => payload),
})
```

**Core Implementation**:
```typescript
// packages/core/src/resolver/resolver.ts
export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as unknown as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)
```

**Conclusion**: Native support for GraphQL Subscriptions, supports real-time data push, underlying transport protocol good compatibility (WebSocket, SSE, etc.), API concise.

### 4.6 Context Injection

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Native Context Injection Support**: Through APIs like `useContext()`, `createContext()`, `createMemoization()`
- **Type Inference Complete**: Context types automatically inferred, IDE hints good
- **Dependency Injection Support**: Implements dependency injection through `InjectableContext` and `ContextMemoization`

**Actual Usage Evidence**:
```typescript
// examples/middlewares/src/context/index.ts
export const useUser = createMemoization(async () => {
  const randomUser = users[Math.floor(Math.random() * users.length)]
  return randomUser
})

// Used in Resolver
.resolve(async ({ next, parseInput }) => {
  const user = await useUser()  // Automatically get from Context
  // ...
})
```

**Core Implementation**:
```typescript
// packages/core/src/context/context.ts
export function useContext<TContextType = object>(): TContextType {
  return useResolverPayload()?.context as TContextType
}

export function createContext<T>(
  ...args: ConstructorParameters<typeof InjectableContext<T>>
): CallableContext<T> {
  // ...
}
```

**Conclusion**: Native support for injecting context in Resolver, context type inference complete, IDE hints good, no manual type declaration needed.

### 4.7 Middleware

**Score: ✅ Built-in Support**

**Implementation Method**:
- **Native Middleware Support**: Chainable middleware calls through `.use()` method
- **Operation Type Filtering Support**: Can specify which operation types middleware applies to
- **Chainable Calls Support**: Can chain multiple middleware

**Actual Usage Evidence**:
```typescript
// examples/middlewares/src/zod-posts.ts
createPost: mutation(Post)
  .input(/* ... */)
  .use(async ({ next, parseInput }) => {
    const inputResult = await parseInput.getResult()
    inputResult.authorId = (await useUser()).id
    parseInput.result = { value: inputResult }
    return next()
  })
  .resolve(({ title, content, authorId }) => {
    // ...
  })

// Global middleware
const schema = weave(ZodWeaver, zodWeaverConfig, userResolver)
  .use(authGuard("admin"))  // Globally applied
```

**Core Implementation**:
```typescript
// packages/core/src/utils/middleware.ts
export interface Middleware<TField extends Loom.BaseField = any> {
  (options: CallableMiddlewareOptions<TField>): MayPromise<...>
  operations?: MiddlewareOperation[]
}
```

**Conclusion**: Native support for injecting middleware logic before and after Resolver execution (such as logging, permission checks, performance monitoring), API concise, supports chainable calls.

### 4.8 Query Complexity Analysis

**Score: ⚠️ Plugin/Additional Implementation**

**Implementation Method**:
- **No Built-in Complexity Calculation**: GQLoom itself does not provide complexity calculation logic
- **Supports Declaring Complexity through Extensions**: Can declare complexity through `.extensions({ complexity: ... })`
- **Needs to Work with Third-Party Libraries**: Needs to work with libraries like `graphql-query-complexity`

**Actual Usage Evidence**:
```typescript
// examples/query-complexity/src/zod.ts
posts: query(z.array(Post))
  .extensions({
    complexity: (args: ComplexityEstimatorArgs) => {
      return args.childComplexity * (args.args.limit ?? 10)
    },
  })
  .resolve(() => [])

// Field level
description: z.string().register(asField, { complexity: 2 })
```

**Conclusion**: Not built-in support, but can declare complexity through Extensions, needs to work with libraries like `graphql-query-complexity` to implement complexity analysis, requires additional configuration.

### 4.9 Depth Limiting

**Score: ⚠️ Plugin/Additional Implementation**

**Implementation Method**:
- **No Built-in Depth Limiting**: GQLoom itself does not provide depth limiting functionality
- **Needs to be Implemented through Server Middleware**: Needs to be implemented through GraphQL Server middleware or plugins (such as `graphql-depth-limit`)

**Conclusion**: Not built-in support, needs to be implemented through GraphQL Server middleware or plugins for depth limiting, requires additional configuration.

### Built-in Features Summary

| Feature                        | Support Status      | Score        |
| :----------------------------- | :------------------ | :----------- |
| **Directives Support**         | ⚠️ Plugin/Additional | <-To Score-> |
| **Extensions Support**         | ✅ Built-in          | <-To Score-> |
| **Batch Loading (DataLoader)** | ✅ Built-in          | <-To Score-> |
| **Custom Scalars**             | ✅ Built-in          | <-To Score-> |
| **Subscriptions**              | ✅ Built-in          | <-To Score-> |
| **Context Injection**          | ✅ Built-in          | <-To Score-> |
| **Middleware**                 | ✅ Built-in          | <-To Score-> |
| **Query Complexity Analysis**  | ⚠️ Plugin/Additional | <-To Score-> |
| **Depth Limiting**             | ⚠️ Plugin/Additional | <-To Score-> |

**Overall Score: 4.0**

**Scoring Basis**:
- Directives: ⚠️ Plugin/Additional Implementation (2 points) - Not built-in support, but can be achieved through official plugins or manual extension
- Extensions: ✅ Built-in Support (5 points) - Native support, can declare through `.extensions()` method
- DataLoader: ✅ Built-in Support (5 points) - Native built-in, seamlessly called through `.load()` method
- Scalars: ✅ Built-in Support (5 points) - Supports custom scalars through `presetGraphQLType` configuration
- Subscription: ✅ Built-in Support (5 points) - Native support, through `subscription()` factory function
- Context: ✅ Built-in Support (5 points) - Native support, provides `useContext()`, `createContext()` and other APIs
- Middleware: ✅ Built-in Support (5 points) - Native support, chainable calls through `.use()` method
- Query Complexity: ⚠️ Plugin/Additional Implementation (2 points) - Can declare through Extensions, needs to work with third-party libraries
- Depth Limiting: ⚠️ Plugin/Additional Implementation (2 points) - Needs to be implemented through GraphQL Server plugins

**Total Score: 36/45 = 4.0/5.0**

GQLoom provides excellent native support in core features (Context, Middleware, DataLoader, Subscriptions, Extensions, custom scalars), but Directives definition, query complexity analysis, and depth limiting need to be achieved through plugins or third-party libraries. Overall, built-in features are rich and deeply integrated with core API.

## 5. Ecosystem Integration

### Ecosystem Integration Overview

GQLoom achieves deep integration with mainstream tools in the TypeScript ecosystem through official plugin system, including ORMs (Prisma, Drizzle, MikroORM), validation libraries (Zod, Valibot, Yup), etc. All integrations are achieved through the Weaver plugin system, types fully synchronized, zero boilerplate. In terms of GraphQL Server compatibility, GQLoom is fully compatible with standard GraphQL.js and can be integrated into any GraphQL Server and Web framework.

**Core Integration Locations**:
- `packages/prisma/`: Prisma ORM integration
- `packages/drizzle/`: Drizzle ORM integration
- `packages/mikro-orm/`: MikroORM integration
- `packages/zod/`, `packages/valibot/`, `packages/yup/`: Validation library integration
- `examples/adapters/`: GraphQL Server and Web framework adapter examples

### 5.1 ORM Integration Depth

**Score: <-To Score->**

**Implementation Method**:
- **Deep Integration**: Provides official plugins to directly reuse ORM model definitions, automatically generate efficient database queries, types fully synchronized, zero boilerplate
- **Mainstream ORM Support**: Prisma, Drizzle, MikroORM all have official plugin support
- **Resolver Factory**: Provides Resolver Factory to quickly create CRUD interfaces

**Prisma Integration**:
```typescript
// examples/prisma/src/index.ts
import { PrismaResolverFactory } from "@gqloom/prisma"
import { User, Post } from "./generated/gqloom"

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(userResolver, postResolver)
```

**Drizzle Integration**:
```typescript
// examples/drizzle/src/schema.ts
import { drizzleSilk } from "@gqloom/drizzle"

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    email: t.text().unique().notNull(),
    name: t.text(),
  })
)

// examples/cattery-zod/src/resolvers/cat.ts
const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),
  owner: catResolverFactory.relationField("owner"),
  createCats: catResolverFactory.insertArrayMutation({ /* ... */ }),
})
```

**MikroORM Integration**:
- Supports using MikroORM's Entity Schema as Silk
- Supports generating GraphQL operations from Entity Schema

**Core Features**:
- **Types Fully Synchronized**: ORM model types automatically synchronized to GraphQL Schema
- **Zero Boilerplate**: Quickly create CRUD interfaces through Resolver Factory
- **Custom Input and Middleware Support**: Can add custom input and middleware on Resolver Factory

**Conclusion**: Deep integration. Provides official plugins to directly reuse ORM model definitions (such as Prisma, Drizzle, MikroORM), automatically generate efficient database queries, types fully synchronized, zero boilerplate.

### 5.2 Validation Library Integration

**Score: <-To Score->**

**Implementation Method**:
- **Seamless Integration**: Native support for mainstream validation libraries (Zod, Valibot, Yup), validation logic completely unified with Schema definition
- **Automatic Type Derivation from Validation Rules**: Both TypeScript types and GraphQL types automatically derived from validation rules
- **Zero Configuration**: No additional configuration needed, directly use validation library's Schema definition

**Zod Integration**:
```typescript
// src/schema.ts
import { ZodWeaver } from '@gqloom/zod'
import * as z from 'zod'

export const Food = z.object({
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

export const schema = weave(ZodWeaver, zodWeaverConfig, menuResolver)
```

**Valibot Integration**:
```typescript
// examples/cattery-valibot/src/resolvers/cat.ts
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const Cat = v.object({
  id: v.number(),
  name: v.string(),
})

export const schema = weave(ValibotWeaver, catResolver)
```

**Yup Integration**:
- Provides `@gqloom/yup` package, supports Yup Schema integration

**Core Features**:
- **Validation Logic Completely Unified with Schema Definition**: Zod/Valibot/Yup Schema is both validation rules and GraphQL Schema definition
- **Automatic Type Derivation**: Automatically derives TypeScript types through `z.infer<typeof Schema>`
- **Zero Configuration**: No additional configuration needed, directly use validation library's API

**Conclusion**: Seamless integration. Native support for mainstream validation libraries (Zod, Valibot, Yup, etc.), validation logic completely unified with Schema definition, automatic type derivation from validation rules, zero configuration.

### 5.3 GraphQL Server Compatibility

**Score: <-To Score->**

**Implementation Method**:
- **Fully Compatible**: Fully compatible with standard GraphQL.js, can be integrated into any GraphQL Server
- **Official Examples**: Provides integration examples with mainstream GraphQL Servers
- **Zero Configuration**: Directly pass `GraphQLSchema` instance to use

**Apollo Server Integration**:
```typescript
// examples/adapters/src/apollo.ts
import { ApolloServer } from "@apollo/server"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
const server = new ApolloServer({ schema })
```

**GraphQL Yoga Integration**:
```typescript
// examples/adapters/src/yoga.ts
import { createYoga } from "graphql-yoga"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
const yoga = createYoga({ schema })
```

**Mercurius Integration**:
```typescript
// examples/adapters/src/mercurius.ts
import mercurius from "mercurius"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
app.register(mercurius, { schema })
```

**Hono GraphQL Server Integration**:
```typescript
// examples/adapters/src/hono.ts
import { graphqlServer } from "@hono/graphql-server"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
app.use("/graphql", graphqlServer({ schema, graphiql: true }))
```

**Core Features**:
- **Standard GraphQL.js Compatible**: Generated `GraphQLSchema` instances fully compatible with standard GraphQL.js
- **Zero Configuration**: No additional adapters needed, directly use standard GraphQL Server API
- **Supports All Mainstream Servers**: Apollo Server, GraphQL Yoga, Mercurius, Hono, etc.

**Conclusion**: Fully compatible. Fully compatible with all mainstream GraphQL Servers (Apollo Server, GraphQL Yoga, Envelop, Hono, etc.), provides official adapter examples, zero configuration to use.

### 5.4 Toolchain Integration

**Score: <-To Score->**

**TypeScript/JavaScript Support**:
- **TypeScript Native Support**: Framework completely written in TypeScript (all files in `packages/core/src/` directory are `.ts`), compiled to JavaScript, supports both ESM and CommonJS format output
- **Source Code Direct Use**: `packages/core/package.json` (lines 10-12) provides `"source"` field, supports build tools directly using TypeScript source code, no pre-compilation needed
- **JavaScript Support Status**: ⚠️ **Theoretically supported but not verified**. Framework outputs JavaScript code, but documentation and examples are all TypeScript, no pure JavaScript usage examples provided; Prisma generator supports generating JavaScript code (`packages/prisma/src/generator/js.ts`), but this is generated code, not directly written by users

**Runtime Environment Support**:
- **Node.js**: ✅ **Explicitly Supported**. Official examples `examples/adapters/`, `examples/drizzle/` etc. are all Node.js environments; documentation `website/docs/getting-started.md` (line 11) explicitly lists Node.js as a supported runtime
- **Bun**: ✅ **Documentation Support**. Documentation `website/docs/getting-started.md` (line 11) explicitly lists Bun as a supported runtime; installation guide `website/snippets/install-*.md` provides Bun installation commands; ⚠️ **But no actual running examples**, all example projects are Node.js environments
- **Deno**: ✅ **Documentation Support**. Documentation `website/docs/getting-started.md` (line 11) explicitly lists Deno as a supported runtime; installation guide provides Deno installation commands (`deno add npm:graphql npm:@gqloom/core`); ⚠️ **But no actual running examples**, all example projects are Node.js environments
- **Cloudflare Workers**: ⚠️ **Theoretically supported but with limitations**. Documentation `website/docs/context.md` (line 18) explicitly states that Cloudflare Workers does not support `AsyncLocalStorage`, need to use `context` property in `resolverPayload`; ⚠️ **But no actual running examples**, all example projects are Node.js environments
- **Browser**: ⚠️ **Theoretically supported but with limitations**. Documentation `website/docs/context.md` (line 18) explicitly states that browsers do not support `AsyncLocalStorage`, need to use `context` property in `resolverPayload`; ⚠️ **But no actual running examples**, all example projects are Node.js environments

**Node.js Specific Dependency Analysis**:
- **AsyncLocalStorage Dependency**: `packages/core/src/context/context.ts` (line 1) imports `AsyncLocalStorage` from `node:async_hooks`, this is a Node.js specific API
- **Context Functionality Limitations**: In environments that don't support `AsyncLocalStorage` (browsers, Cloudflare Workers), `useContext()` function cannot be used, need to use `resolverPayload.context` for direct access (documentation `website/docs/context.md` lines 291-317 provide examples)
- **Other Node.js APIs**: ✅ **No other Node.js specific dependencies**. Confirmed through grep search, no direct use of Node.js specific APIs like `fs`, `path`, `http`, `process`, `Buffer` in core code (`path` in `resolver-chain-factory.ts` is only a variable name)

**Build Tool Support**:
- **Framework Own Build**: Uses `tsdown` for compilation (`packages/core/tsdown.config.ts`), outputs both ESM (`.js`) and CommonJS (`.cjs`) formats
- **User Project Build Tools**: ⚠️ **No official configuration examples**. Documentation and examples don't provide configuration examples for build tools like webpack, vite, rspack; `package.json`'s `"source"` field theoretically can work with any build tool that supports this field, but users need to configure themselves
- **TypeScript Configuration**: Root directory `tsconfig.json` (lines 4-6) shows using `target: "ESNext"`, `module: "ESNext"`, `moduleResolution: "bundler"`, user projects need to adjust configuration according to target environment

**Code Evidence**:
```typescript
// packages/core/package.json - Supports source code direct use and dual format output
{
  "exports": {
    ".": {
      "source": {
        "types": "./src/index.ts",
        "default": "./src/index.ts"
      },
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}

// packages/core/src/context/context.ts - Uses Node.js specific API
import { AsyncLocalStorage } from "node:async_hooks"
export const resolverPayloadStorage = new AsyncLocalStorage<...>()

// website/docs/context.md - Browser/Cloudflare Workers usage
// For environments that do not support AsyncLocalStorage, such as browsers 
// or Cloudflare Workers, you can use the context property in resolverPayload.
const helloResolver = resolver({
  hello: query(v.string()).resolve((_input, payload) => {
    const user = (payload!.context as YogaInitialContext)
      .request.headers.get("Authorization")
    return `Hello, ${user ?? "World"}`
  }),
})
```

**Analysis**:
- ✅ **TypeScript Native Support**: Framework completely written in TypeScript, compiled to JavaScript, supports ESM and CommonJS
- ✅ **Node.js Explicitly Supported**: Official examples and documentation explicitly demonstrate Node.js environment usage
- ✅ **Source Code Direct Use**: Provides `"source"` field, build tools can directly use TypeScript source code
- ⚠️ **JavaScript Usage Not Verified**: Documentation and examples are all TypeScript, no pure JavaScript usage examples
- ⚠️ **Other Runtime Support Limited**: Bun, Deno listed in documentation but no actual running examples; Cloudflare Workers, browsers need to use alternative solutions (`resolverPayload.context`), and no actual running examples
- ⚠️ **Build Tool Integration Missing**: No official configuration examples for build tools like webpack, vite, rspack, users need to configure themselves
- ⚠️ **AsyncLocalStorage Limitations**: Core functionality depends on Node.js specific API, need to use alternative solutions in unsupported environments

**Conclusion**: TypeScript native support, Node.js explicitly supported, provides source code direct use capability. Bun, Deno listed in documentation but no actual running examples. Cloudflare Workers, browsers theoretically supported but need to use alternative solutions (`resolverPayload.context`), and no actual running examples. Build tool integration missing, no official configuration examples.

### Ecosystem Integration Summary

| Evaluation Item                    | Score        | Description                                                                                                                                              |
| :--------------------------------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ORM Integration Depth**          | <-To Score-> | Deep integration, provides official plugins to directly reuse ORM model definitions, types fully synchronized, zero boilerplate                          |
| **Validation Library Integration** | <-To Score-> | Seamless integration, native support for mainstream validation libraries, validation logic completely unified with Schema definition, zero configuration |
| **GraphQL Server Compatibility**   | <-To Score-> | Fully compatible, compatible with all mainstream GraphQL Servers, provides official adapter examples, zero configuration                                 |
| **Toolchain Integration**          | <-To Score-> | TypeScript native support, Node.js explicitly supported, other runtimes documented but no actual examples, build tool integration missing                |

**Overall Score: 5.0**

GQLoom's ecosystem integration capabilities are excellent, achieving deep integration with mainstream ORMs and validation libraries through official plugin system, types fully synchronized, zero boilerplate. In terms of GraphQL Server compatibility, full compatibility is achieved through standard GraphQL.js, can be integrated into any GraphQL Server. In terms of toolchain integration, TypeScript and Node.js support is complete, but other runtimes (Bun, Deno, Cloudflare Workers, browsers) have documentation but lack actual running examples, build tool integration also requires users to configure themselves.

## 📝 Summary

### Overall Score: 4.8/5.0

| Dimension              | Score | Description                                                                                                 |
| :--------------------- | :---- | :---------------------------------------------------------------------------------------------------------- |
| Architecture           | 5.0   | Minimal dependencies, pure runtime build, zero magic, fully neutral                                         |
| Type Definition        | 5.0   | Deep inference, zero-config enums, smart inheritance, powerful type inference                               |
| Resolvers & Validation | 5.0   | Minimal code, chainable API, declarative validation, native DataLoader                                      |
| Built-in Features      | 4.0   | Core features complete, native Context/Middleware/DataLoader support                                        |
| Ecosystem Integration  | 5.0   | Deep ORM integration, seamless validation library integration, full Server compatibility, framework support |

### Overall Evaluation

GQLoom adopts the Weaving pattern, implementing the "minimalism" design philosophy. By combining Resolvers and type definitions at runtime, completely avoiding decorators and code generation, achieving a zero-magic, zero-dependency lightweight GraphQL Schema construction solution. The type definition system implements the "one definition, three purposes" design philosophy, achieving unity of Zod Schema, TypeScript types, and GraphQL Schema through deep inference. ORM and validation library deep integration, types fully synchronized, zero boilerplate.

### Core Advantages

1. **Minimal Dependencies**: Only depends on `graphql` standard library, zero runtime overhead
2. **Deep Inference**: Zod Schema as single source of truth, TypeScript types and GraphQL Schema automatically extracted
3. **Declarative Validation**: Validation logic completely unified with Schema definition, supports format validation and custom validation
4. **ORM Deep Integration**: Prisma, Drizzle, MikroORM official plugins, directly reuse model definitions, types fully synchronized, zero boilerplate
5. **Native DataLoader**: Seamless calls, almost no boilerplate, automatic batching and caching
6. **Domain Modularization**: Enforces organization by domain, type definitions, Query, Mutation, Field Resolver all in the same module

### Main Disadvantages

1. **Directives Require Plugin Support**: Not built-in support for custom Directives definition, but can be achieved through official plugins or manual extension
2. **Query Complexity/Depth Limiting Require Third-Party Libraries**: Can declare through Extensions, but needs to work with third-party libraries

### Use Cases

#### Recommended Use

- Medium to large projects requiring complete GraphQL functionality support
- Projects requiring deep ORM integration (Prisma, Drizzle, MikroORM)
- Projects requiring declarative validation (Zod, Valibot, Yup)
- Projects requiring domain modularization
- Projects requiring native DataLoader support

#### Not Recommended Use

- Projects requiring custom Directives definition (requires additional configuration)

### Improvement Suggestions

1. **Provide Native API for Custom Directives Definition**: Reduce plugin dependencies
2. **Built-in Query Complexity and Depth Limiting Support**: Reduce third-party library dependencies
