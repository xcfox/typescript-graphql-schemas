# Garph Evaluation Report (January 2026)

> This report is generated based on [example business code](https://github.com/xcfox/typescript-graphql-schemas/tree/main/garph/src) and [official examples](https://github.com/stepci/garph/tree/main/examples).

## 📋 Basic Information
| Project             | Content                         |
| :------------------ | :------------------------------ |
| **Current Version** | 0.6.8                           |
| **GitHub**          | https://github.com/stepci/garph |
| **Documentation**   | https://garph.dev/docs          |
| **First Commit**    | 2023-01-19                      |
| **Latest Commit**   | 2024-03-01                      |

## 📊 Overall Score
| Dimension                     | Score (1-5) | Brief Review                                                                      |
| :---------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| **1. Architecture Pattern**   | **4.5**     | Builder pattern, zero magic, write and use immediately, lightweight dependencies  |
| **2. Type Definition**        | **3.5**     | Deep inference, smart inheritance, flexible enums, Union requires manual handling |
| **3. Resolvers & Validation** | **2.9**     | Automatic parameter inference, native DataLoader, no built-in validation          |
| **4. Built-in Features**      | **3.0**     | Core features complete, advanced features missing, security features insufficient |
| **5. Ecosystem Integration**  | **2.0**     | Standard compatible, weak ORM/validation integration, no official adapters        |

---

## 1. Architecture Pattern (Architecture)

### Architecture Pattern Type

**Builder Pattern**: Garph uses a functional chained API to explicitly build GraphQL Schema, provides type definition methods through `GarphSchema` instances (usually named `g`), and finally converts definitions to standard GraphQL Schema at runtime through the `buildSchema()` function.

### Core Implementation Mechanism

**Source Code Evidence**:
- Core API definition: `garph/src/index.ts` (lines 598-727) defines the `GarphSchema` class and its methods
- Schema building: The `buildSchema()` function in `garph/src/schema.ts` (lines 17-21) uses `graphql-compose`'s `SchemaComposer` for conversion
- Business code example: `typescript-graphql-schemas/garph/src/schema.ts` (line 7) creates a `GarphSchema` instance, line 306 calls `buildSchema({ g, resolvers })`

**Build Flow**:
```typescript
// 1. Create Schema instance
const g = new GarphSchema()

// 2. Define types (chained API)
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
})

// 3. Build Schema at runtime
const schema = buildSchema({ g, resolvers })
```

### Scoring Details

#### 1.1 Dependency Complexity (Dependency Complexity)

**Score: 4.0**

**Evidence**:
- **Runtime dependencies** (`garph/package.json` lines 30-33):
  - `graphql-compose: ^9.0.10` - GraphQL Schema building tool
  - `single-user-cache: ^0.6.0` - DataLoader cache implementation
- **No decorator dependencies**: No need for `reflect-metadata` or decorator support
- **No code generation tools**: No need for CLI or code generation steps

**Analysis**:
- ✅ Only 2 runtime dependencies, lighter than decorator pattern (requires `reflect-metadata`, `class-validator`, etc.)
- ⚠️ `graphql-compose` is a feature-complete Schema building library, increases dependency size but provides powerful underlying capabilities
- ✅ `single-user-cache` is used for built-in DataLoader support, a feature enhancement rather than a core dependency

#### 1.2 Build Flow (Build Flow)

**Score: 5.0**

**Evidence**:
- **Pure runtime building**: The `buildSchema()` function in `garph/src/schema.ts` (lines 17-21) executes at runtime
- **No code generation**: Business code (`typescript-graphql-schemas/garph/src/server.ts`) runs TypeScript directly, no pre-build steps required
- **No CLI tools**: `garph/package.json` has no dedicated build scripts, only documentation and test scripts

**Actual Usage**:
```typescript
// typescript-graphql-schemas/garph/src/server.ts
import { schema } from './schema.ts'
const yoga = createYoga({ schema })
// Run directly, no build steps required
```

**Analysis**:
- ✅ Complete runtime building, developers can run code directly after writing
- ✅ Supports hot reload (e.g., `node --watch`), excellent development experience
- ✅ No need to learn additional CLI commands or build configurations

#### 1.3 Config & Language Magic (Config & Language Magic)

**Score: 5.0**

**Evidence**:
- **No decorators**: All type definitions use function calls, such as `g.type()`, `g.string()`
- **No reflection metadata**: No need for `import 'reflect-metadata'` or `experimentalDecorators` configuration
- **Standard TypeScript**: `typescript-graphql-schemas/garph/tsconfig.json` only contains standard configuration, no special settings
- **Type inference**: Uses TypeScript generics and conditional types to achieve type safety (`Infer`, `InferResolvers`)

**Code Example**:
```typescript
// Fully compliant with native TypeScript best practices
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
})

// Type inference works automatically
type User = Infer<typeof UserType>
```

**Analysis**:
- ✅ Zero magic, fully compliant with native TypeScript best practices
- ✅ No dependency on experimental features or compiler plugins
- ✅ Excellent IDE support, type hints and autocomplete work normally
- ✅ Strong code readability, chained API is intuitive and easy to understand

#### 1.4 Ecosystem Integration (Ecosystem Integration)

**Score: 4.0**

**Evidence**:
- **Standard installation**: `npm install garph` can be used immediately, no special requirements
- **Server compatibility**: Official examples (`garph/examples/demo.ts`) use `graphql-yoga`, but can integrate with any GraphQL Server
- **Uses graphql-compose under the hood**: `garph/src/schema.ts` (line 2) imports `SchemaComposer`, ultimately outputs standard `GraphQLSchema`
- **Business code integration**: `typescript-graphql-schemas/garph/src/server.ts` directly uses `graphql-yoga`, simple integration

**Analysis**:
- ✅ Standard npm package, can be freely integrated into any project
- ✅ Outputs standard GraphQL Schema, compatible with all GraphQL Servers
- ✅ Not bound to specific frameworks, flexible choice of underlying implementation
- ⚠️ Although not mandatory, official examples and documentation mainly showcase `graphql-yoga` integration

### Architecture Pattern Overall Score

**Score: 4.5**

**Scoring Basis**:
- Dependency complexity: **4.0** (lightweight dependencies, but `graphql-compose` increases size)
- Build flow: **5.0** (write and use immediately, zero build steps)
- Config & language magic: **5.0** (zero magic, completely native TypeScript)
- Ecosystem integration: **4.0** (good integration, standard compatible)

**Advantages**:
1. **Zero-config startup**: No need for decorators, reflection, or code generation, works out of the box
2. **Type safety**: Achieves end-to-end type safety through TypeScript type system
3. **Excellent development experience**: Chained API is intuitive, IDE support is complete
4. **Runtime building**: Supports hot reload, fast development iteration

**Disadvantages**:
1. **Dependency on graphql-compose**: Although powerful, increases package size
2. **Explicit API calls**: Compared to decorator pattern, requires more explicit code (but gains zero magic advantage)

## 2. Type Definition (Type Definition)

### Core Implementation Mechanism

Garph uses **Builder API + type inference** to implement type definitions. Schema definitions are created through chained API, TypeScript types are automatically inferred from Schema definitions through the `Infer` utility type, and GraphQL Schema is generated at runtime through `buildSchema()`.

**Source Code Evidence**:
- Type inference implementation: `garph/src/index.ts` (lines 93-118) defines the `Infer` type utility
- Schema building: `garph/src/schema.ts` (lines 85-170) converts Garph types to GraphQL Schema
- Business code example: `typescript-graphql-schemas/garph/src/schema.ts` (lines 68-70) uses `Infer` to infer types

### Scoring Details

#### 2.1 Single Source of Truth (SSOT) Implementation

**Score: 4.0**

**Evidence**:
- **Schema definition as data source**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 23-66) defines Schema through methods like `g.type()`
- **TypeScript type automatic inference**: Lines 68-70 use `Infer<typeof UserType>` to infer types from Schema definition
- **GraphQL Schema automatic generation**: Line 306 generates standard GraphQL Schema through `buildSchema({ g, resolvers })`
- **Validation logic separation**: Validation needs to be manually implemented in Scalar or Resolver (line 181), does not support automatic type generation from validation rules

**Code Example**:
```typescript
// Single source of truth: Schema definition
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
})

// TypeScript type automatic inference
type User = Infer<typeof UserType>
// Result: { id: number, name: string, email: string }

// GraphQL Schema automatic generation
const schema = buildSchema({ g, resolvers })
```

**Analysis**:
- ✅ Schema definition is the single source of truth, both TypeScript types and GraphQL Schema are derived from it
- ✅ Deep type inference: Supports nested types, optional fields, arrays, and other complex scenarios
- ⚠️ Validation logic needs manual integration: Although there are Zod examples (`garph/www/docs/advanced/validation.md` lines 35-70), it's not native support, needs manual validation calls in Scalar's `parseValue`
- ⚠️ Validation rules separated from type definitions: Cannot automatically generate types from validation rules, needs manual synchronization

#### 2.2 Enum & String Union Support (Enum & String Union Types)

**Score: 4.0**

**Evidence**:
- **`as const` array support**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 15-19) uses `g.enumType('OrderStatus', ['PENDING', 'COMPLETED', 'CANCELLED'] as const)`
- **TypeScript Enum support**: Official documentation (`garph/www/docs/guide/schemas.md` lines 129-138) shows support for TypeScript Enum
- **Type inference requirement**: Must use `as const` to correctly infer types (documentation line 127 explicitly states)

**Code Example**:
```typescript
// Method 1: as const array (recommended)
const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

// Method 2: TypeScript Enum
enum Fruits {
  Apples,
  Oranges
}
g.enumType('Fruits', Fruits)
```

**Analysis**:
- ✅ Supports two methods: `as const` array and TypeScript Enum
- ✅ No need to redefine member names: Directly use array or Enum, no manual mapping required
- ⚠️ Must use `as const`: Missing `as const` will cause type inference to fail, developers need to remember this requirement
- ✅ Type safe: Enum values are completely synchronized in TypeScript and GraphQL

#### 2.3 Interface Inheritance & Union Type Experience (Interface & Union)

**Score: 4.0**

**Evidence**:
- **Interface fields automatic inheritance**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 34-51) demonstrates interface implementation
  - `FoodInterface` defines common fields (id, name, price)
  - `CoffeeType` and `DessertType` automatically inherit through `.implements(FoodInterface)`
  - Implementation types only need to define unique fields (sugarLevel/origin and calories)
- **Runtime automatic merging**: `garph/src/schema.ts` (lines 94-98) automatically adds interface fields to implementation types when building Schema
- **Type system support**: `garph/src/index.ts` (line 195) uses `UnionToIntersection` to merge interface fields at the type level
- **Union types require manual handling**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 202-211) needs to manually return `__typename` in Resolver
- **Union type resolution**: `garph/examples/union.ts` (lines 36-39) needs to manually implement `__resolveType`

**Code Example**:
```typescript
// Interface definition
const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})

// Implement interface (automatic field inheritance)
const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)
// CoffeeType automatically includes id, name, price fields

// Union type definition
const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})

// Union types require manual __typename handling
createCoffee: (_, { name, price, sugarLevel, origin }) => {
  return {
    __typename: 'Coffee' as const,  // Must manually specify
    id,
    name,
    price,
    sugarLevel,
    origin,
  }
}
```

**Analysis**:
- ✅ Interface fields automatic inheritance: Implementation types don't need to repeat common field declarations
- ✅ Type system support: TypeScript types also automatically include interface fields
- ⚠️ Union types require manual `__typename`: Must explicitly specify type name in return object
- ⚠️ Union types require manual `__resolveType`: Need to implement type resolution function (optional but usually needed)
- ✅ Supports multiple interface implementation: Can implement multiple interfaces simultaneously (`garph/examples/implements.ts` line 13)

#### 2.4 Type Inference Strength & Explicit Declaration Balance

**Score: 3.0**

**Evidence**:
- **Automatic inference of basic types**: `garph/src/index.ts` (lines 108-118) `InferShallow` automatically handles String, Int, Float, Boolean, ID, Enum and other basic types
- **Automatic inference of complex types**: Supports arrays (`AnyList`), optional (`AnyOptional`), nested objects (recursive `InferRaw`), Union types
- **Resolver type inference**: `InferResolvers` (lines 134-154) automatically infers Resolver parameter types and return value types
- **Requires explicit type annotations**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 152-160) needs to add `InferResolvers` type annotation to Resolver object

**Code Example**:
```typescript
// Basic type automatic inference
const UserType = g.type('User', {
  id: g.int(),           // Inferred as number
  name: g.string(),      // Inferred as string
  email: g.string(),     // Inferred as string
})

type User = Infer<typeof UserType>
// Automatically inferred as: { id: number, name: string, email: string }

// Complex type automatic inference
const OrderType = g.type('Order', {
  userId: g.int(),
  itemIds: g.int().list(),              // Inferred as number[]
  status: g.ref(OrderStatusEnum),        // Inferred as enum value
  createdAt: g.ref(DateTime),            // Inferred as Date
  items: g.ref(MenuItemType).list(),    // Inferred as MenuItem[]
})

// Resolver type automatic inference
const resolvers: InferResolvers<
  { Query: typeof queryType },
  {}
> = {
  Query: {
    user: (_, { id }) => {  // id automatically inferred as number
      // ...
    }
  }
}
```

**Analysis**:
- ✅ Powerful type inference: Supports all GraphQL types including basic types, arrays, optional, nested, Union
- ✅ Resolver parameter type automatic inference: Automatically infers parameter types through `InferResolvers`, no manual declaration needed
- ✅ Recursive type inference: Supports deeply nested object types
- ⚠️ Requires explicit type annotations: Resolver object needs to add `InferResolvers` type annotation (although this is for type safety, it increases code volume)
- ✅ Excellent IDE support: Type hints and autocomplete work normally

### Type Definition Overall Score

**Score: 3.5**

**Scoring Basis**:
- SSOT implementation: **4.0** (deep inference, but validation logic separated)
- Enum support: **4.0** (lightweight mapping, but requires `as const`)
- Interface inheritance: **4.0** (smart inheritance, but Union requires manual handling)
- Type inference strength: **3.0** (powerful inference, but requires explicit type annotations)

**Advantages**:
1. **Powerful type inference**: Automatically infers TypeScript types from Schema definitions, supports complex scenarios
2. **Interface automatic inheritance**: No need to repeat common field declarations when implementing interfaces
3. **Flexible enum support**: Supports `as const` arrays and TypeScript Enum
4. **Complete type safety**: End-to-end type safety, from Schema to Resolver

**Disadvantages**:
1. **Union types require manual handling**: Must manually return `__typename` and implement `__resolveType`
2. **Validation logic separated**: Validation rules separated from type definitions, needs manual synchronization
3. **Requires explicit type annotations**: Resolver object needs to add `InferResolvers` type annotation

## 3. Resolvers & Validation (Resolvers & Validation)

### Core Implementation Mechanism

Garph's Resolver definition uses **explicit type annotations + automatic type inference**. All Resolvers are centralized in one object, organized by `Query`, `Mutation`, and type names. Parameter types are automatically inferred through the `InferResolvers` utility type, but explicit type annotations need to be added to the Resolver object.

**Source Code Evidence**:
- Resolver type inference: `garph/src/index.ts` (lines 134-154) defines the `InferResolvers` type utility
- Business code example: `typescript-graphql-schemas/garph/src/schema.ts` (lines 152-304) demonstrates complete Resolver definition

### Scoring Details

#### 3.1 Development Experience (Code Conciseness)

**Score: 3.5**

**Evidence**:
- **Resolver definition concise**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 161-178) Query Resolver definition is intuitive
- **Parameter type automatic inference**: In line 163's `user: (_, { id })`, `id` type is automatically inferred as `number`
- **Requires explicit type annotations**: Lines 152-160 need to add `InferResolvers` type annotation to Resolver object
- **Validation logic manually written**: Lines 181, 192, 250-260 need to manually write validation logic

**Code Example**:
```typescript
// Resolver definition (concise but requires type annotation)
const resolvers: InferResolvers<
  {
    Query: typeof queryType
    Mutation: typeof mutationType
    User: typeof UserType
    Order: typeof OrderType
  },
  {}
> = {
  Query: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {  // id automatically inferred as number
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      // Need to manually write validation logic
      if (!email.includes('@')) {
        throw new GraphQLError('Invalid email format')
      }
      // ...
    },
  },
}
```

**Analysis**:
- ✅ Resolver function definition concise, parameter types automatically inferred
- ✅ Excellent IDE support, type hints and autocomplete work normally
- ⚠️ Requires explicit type annotations: Resolver object needs to add `InferResolvers` type annotation (although this is for type safety, it increases code volume)
- ⚠️ Validation logic needs manual writing: Each place that needs validation must manually write validation code

#### 3.2 Modular Design (Domain-Driven Development Support)

**Score: 0.0**

**Evidence**:
- **Organized by operation type**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 152-304) all Resolvers are in one object, organized by `Query`, `Mutation`, `User`, `Order`
- **No enforced module boundaries**: No enforced module boundaries, all Resolvers are in the same file
- **Easy to write coupled code**: If not careful, easy to write all domain Query/Mutation/Field Resolvers in one file
- **Can manually split**: Although can split files by domain modules, needs manual combination, and no enforced module boundaries

**Code Example**:
```typescript
// All Resolvers in one object, organized by operation type
const resolvers: InferResolvers<...> = {
  Query: {
    users: ...,
    user: ...,
    menu: ...,
    menuItem: ...,
    orders: ...,
    order: ...,
  },
  Mutation: {
    createUser: ...,
    updateUser: ...,
    deleteUser: ...,
    createCoffee: ...,
    // ... All Mutations mixed together
  },
  User: {
    orders: ...,
  },
  Order: {
    user: ...,
    items: ...,
  },
}
```

**Analysis**:
- ❌ Completely isolated by operation type: `Query`, `Mutation`, `Type` organized separately, not by domain
- ❌ No enforced module boundaries: No enforced module boundaries, easy to write coupled giant files
- ⚠️ Needs manual combination: If modularizing, needs to manually split files and combine, but framework doesn't enforce
- ⚠️ Limited DDD support: Although can organize by files, lacks enforced module boundaries, easy to write coupled code

#### 3.3 Parameter Definition & Type Inference

**Score: 4.0**

**Evidence**:
- **Parameter definition in fields**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 80-82) parameters defined in fields through `.args()`
- **Parameter type automatic inference**: In line 163's `user: (_, { id })`, `id` type automatically inferred as `number` through `InferResolvers`
- **Excellent IDE hints**: TypeScript fully understands parameter types, IDE autocomplete works normally
- **Requires explicit type annotations**: Lines 152-160 need to add `InferResolvers` type annotation to Resolver object

**Code Example**:
```typescript
// Parameter definition in fields
const queryType = g.type('Query', {
  user: g.ref(UserType).optional().args({
    id: g.int(),  // Parameter definition
  }),
})

// Parameter type automatic inference
const resolvers: InferResolvers<{ Query: typeof queryType }, {}> = {
  Query: {
    user: (_, { id }) => {  // id automatically inferred as number
      // ...
    },
  },
}
```

**Analysis**:
- ✅ Parameter types mostly automatically inferred: Automatically infers parameter types through `InferResolvers`, no manual declaration needed
- ✅ Excellent IDE hints: TypeScript fully understands parameter types, IDE autocomplete works normally
- ⚠️ Requires explicit type annotations: Resolver object needs to add `InferResolvers` type annotation (although this is for type safety, it increases code volume)
- ✅ Type safe: Parameter types completely synchronized with Schema definition

#### 3.4 Input Validation Mechanism

**Score: 2.0**

**Evidence**:
- **No built-in validation**: `typescript-graphql-schemas/garph/src/schema.ts` (lines 181, 192, 250-260) all validation logic needs to be manually written
- **Can implement through Scalar**: `garph/examples/validation.ts` (lines 6-15) demonstrates validation through Scalar's `parseValue`
- **Supports Zod integration**: `garph/www/docs/advanced/validation.md` (lines 35-70) shows using Zod validation, but needs manual calls in Scalar
- **Validation logic scattered**: Validation code scattered across various Resolvers, difficult to reuse

**Code Example**:
```typescript
// Method 1: Manual validation in Resolver
createUser: (_, { name, email }) => {
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  // ...
}

// Method 2: Validation through Scalar
const username = g.scalarType<string, string>('Username', {
  serialize: (username) => username,
  parseValue: (username) => {
    if (username.length < 3) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})

// Method 3: Using Zod (needs manual call)
const usernameValidator = z.string().min(3)
const username = g.scalarType<string, string>('Username', {
  parseValue: (username) => {
    if (!usernameValidator.safeParse(username).success) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})
```

**Analysis**:
- ❌ No built-in validation: Does not provide declarative validation API (like `.refine()` or `@IsEmail()`)
- ❌ Validation logic repetitive: Needs to manually write validation code in each place that needs validation
- ⚠️ Can implement through Scalar: But needs to create independent Scalar types for each validation scenario, increases code volume
- ⚠️ Supports Zod integration: But needs manual calls in Scalar's `parseValue`, validation logic separated from Schema definition
- ❌ No declarative API: Does not provide declarative validation API like `.refine()`

#### 3.5 Batch Loading (DataLoader) Integration

**Score: 5.0**

**Evidence**:
- **Native built-in support**: The `addResolver` function in `garph/src/schema.ts` (lines 193-220) automatically handles `load` and `loadBatch` methods
- **Uses single-user-cache**: Lines 4-5 use `single-user-cache` to implement DataLoader functionality
- **Almost no boilerplate**: `garph/examples/loader.ts` (lines 34-44) shows only need to define `load` function, no need to configure Context or create DataLoader instances
- **Supports cache control**: `load` method supports caching, `loadBatch` method does not support caching

**Code Example**:
```typescript
// Use .omitResolver() when defining fields
const Dog = g.type('Dog', {
  name: g.string(),
  owner: g.string().omitResolver()  // Mark as requiring Resolver
})

// Define load function in Resolver
const resolvers: InferResolvers<{ Query: typeof queryType, Dog: typeof Dog }, {}> = {
  Query: {
    dogs: (parent, args, context, info) => {
      return [{ name: 'Apollo' }, { name: 'Buddy' }]
    }
  },
  Dog: {
    owner: {
      load(queries) {  // Automatic batch loading, supports caching
        return Promise.resolve(
          queries.map(q => owners[q.parent.name])
        )
      }
    }
  }
}
```

**Analysis**:
- ✅ Native built-in support: No need to install additional plugins or configuration, directly use `load` or `loadBatch` methods
- ✅ Almost no boilerplate: Only need to define `load` function, no need to configure Context or create DataLoader instances
- ✅ Automatic batch processing: Framework automatically collects queries and executes in batches
- ✅ Supports cache control: `load` supports caching, `loadBatch` does not support caching
- ✅ Type safe: `load` function parameter and return value types automatically inferred

### Resolvers & Validation Overall Score

**Score: 2.9**

**Scoring Basis**:
- Development experience: 3.5 (code concise, but requires explicit type annotations)
- Modular design: 0.0 (no modular consideration, organized by operation type)
- Parameter definition & type inference: 4.0 (parameter types mostly automatically inferred)
- Input validation mechanism: 2.0 (no built-in validation, needs complete manual implementation)
- DataLoader integration: 5.0 (native built-in support, seamless usage)

**Advantages**:
1. **Parameter type automatic inference**: Automatically infers parameter types through `InferResolvers`, excellent IDE support
2. **DataLoader native support**: Built-in DataLoader support, almost no boilerplate
3. **Code concise**: Resolver function definitions intuitive, easy to understand

**Disadvantages**:
1. **No built-in validation**: Needs to manually write all validation logic, validation code repetitive
2. **Limited modular support**: Organized by operation type, doesn't enforce modularization, easy to write coupled code
3. **Requires explicit type annotations**: Resolver object needs to add `InferResolvers` type annotation

## 4. Built-in Features (Built-in Features)

### Feature Support Overview

Garph provides native support for core features (Context, DataLoader, Subscriptions, Custom Scalars), but has limited support for advanced features (Directives, Middleware, Query Complexity, Depth Limiting).

### Feature Support Details Table

| Feature                        | Support Status                     | Implementation   | Evidence/Explanation                                                                                                                       |
| :----------------------------- | :--------------------------------- | :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Directives**                 | ⛔ Not Implementable                | Not Supported    | Official documentation (`garph/www/docs/guide/schemas.md` line 252) explicitly states "Currently not supported", refer to GitHub issue #40 |
| **Extensions**                 | ⚠️ Plugin/Additional Implementation | Via GraphQLError | `garph/examples/errors.ts` (line 17) demonstrates implementation through `GraphQLError`'s `extensions` parameter, but not a native API     |
| **Batch Loading (DataLoader)** | ✅ Built-in Support                 | Native Built-in  | `garph/src/schema.ts` (lines 193-220) native support for `load` and `loadBatch` methods, almost no boilerplate                             |
| **Custom Scalars**             | ✅ Built-in Support                 | Native Built-in  | `garph/examples/scalars.ts` (line 5) defined through `g.scalarType()`, API intuitive and type safe                                         |
| **Subscriptions**              | ✅ Built-in Support                 | Native Built-in  | `garph/examples/subscriptions.ts` (lines 9-33) native support, implemented through async generator                                         |
| **Context**                    | ✅ Built-in Support                 | Native Built-in  | `garph/examples/context.ts` (lines 15-17) native support, excellent type inference, good IDE hints                                         |
| **Middleware**                 | ⛔ Not Implementable                | Not Supported    | No related support found, cannot inject middleware logic before/after Resolver execution                                                   |
| **Query Complexity**           | ⛔ Not Implementable                | Not Supported    | No related support found, cannot prevent complex query attacks                                                                             |
| **Depth Limiting**             | ⛔ Not Implementable                | Not Supported    | No related support found, cannot prevent deep query attacks                                                                                |

### Detailed Analysis

#### 4.1 Directive Support (Directives)

**Status: ⛔ Not Implementable**

**Evidence**:
- Official documentation (`garph/www/docs/guide/schemas.md` line 252) explicitly states "Currently not supported"
- Refer to GitHub issue #40: https://github.com/stepci/garph/issues/40

**Analysis**:
- ❌ Completely does not support Directives definition
- ❌ Cannot implement Directives functionality through any means
- ⚠️ This is a known limitation, may be supported in future versions

#### 4.2 Extension Support (Extensions)

**Status: ⚠️ Plugin/Additional Implementation**

**Evidence**:
- `garph/examples/errors.ts` (line 17) demonstrates implementation through `GraphQLError`'s `extensions` parameter
- `garph/www/docs/advanced/errors.md` (lines 28-43) shows error extension usage

**Code Example**:
```typescript
throw new GraphQLError('Expected error with extensions', {
  extensions: { code: 'EXPECTED_ERROR' }
})
```

**Analysis**:
- ⚠️ Does not natively support Extensions API
- ⚠️ Can implement through `GraphQLError`'s `extensions` parameter, but needs manual handling
- ⚠️ Cannot declare query complexity, execution time and other extension information

#### 4.3 Batch Loading (DataLoader) Integration

**Status: ✅ Built-in Support**

**Evidence**:
- The `addResolver` function in `garph/src/schema.ts` (lines 193-220) automatically handles `load` and `loadBatch` methods
- `garph/examples/loader.ts` (lines 34-44) shows only need to define `load` function, no need to configure Context or create DataLoader instances
- Uses `single-user-cache` to implement DataLoader functionality

**Code Example**:
```typescript
Dog: {
  owner: {
    load(queries) {  // Automatic batch loading, supports caching
      return Promise.resolve(
        queries.map(q => owners[q.parent.name])
      )
    }
  }
}
```

**Analysis**:
- ✅ Native built-in support, no need to install additional plugins
- ✅ Almost no boilerplate, only need to define `load` function
- ✅ Automatic batch processing, supports cache control (`load` supports caching, `loadBatch` does not)

#### 4.4 Custom Scalars (Scalars)

**Status: ✅ Built-in Support**

**Evidence**:
- `garph/examples/scalars.ts` (line 5) demonstrates defining custom scalars through `g.scalarType()`
- `typescript-graphql-schemas/garph/src/schema.ts` (lines 9-13) demonstrates DateTime scalar definition
- `garph/src/index.ts` (lines 435-451) defines `GScalar` class and `scalarType` method

**Code Example**:
```typescript
const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})
```

**Analysis**:
- ✅ Easy to define new scalar types, API intuitive
- ✅ Type safe, supports generic parameters to specify input/output types
- ⚠️ Does not include built-in common scalars (like DateTime, JSON, BigInt), needs manual definition or use third-party libraries (like `graphql-scalars`)

#### 4.5 Subscriptions (Subscription)

**Status: ✅ Built-in Support**

**Evidence**:
- `garph/examples/subscriptions.ts` (lines 9-33) demonstrates native Subscriptions support
- `garph/src/index.ts` (lines 135-139) `InferResolvers` type supports Subscription type
- Implements real-time data push through async generator

**Code Example**:
```typescript
const subscriptionType = g.type('Subscription', {
  counter: g.int(),
})

const resolvers: InferResolvers<{ Subscription: typeof subscriptionType }, {}> = {
  Subscription: {
    counter: {
      subscribe: async function* (parent, args, context, info) {
        for (let i = 100; i >= 0; i--) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          yield { counter: i }
        }
      }
    }
  }
}
```

**Analysis**:
- ✅ Native support for GraphQL Subscriptions
- ✅ Supports real-time data push, implemented through async generator
- ✅ Good underlying transport protocol compatibility (supports WebSocket, SSE, etc. through graphql-yoga)
- ✅ API concise, type safe

#### 4.6 Context Injection (Context)

**Status: ✅ Built-in Support**

**Evidence**:
- `garph/examples/context.ts` (lines 9-26) demonstrates Context usage
- `garph/src/index.ts` (lines 134-154) `InferResolvers` type supports Context type parameter
- `garph/www/docs/advanced/context.md` provides complete Context usage documentation

**Code Example**:
```typescript
const context = () => {
  return {
    hello: 'world'
  }
}

const resolvers: InferResolvers<
  { Query: typeof queryType },
  { context: YogaInitialContext & ReturnType<typeof context> }
> = {
  Query: {
    context: (parent, args, context, info) => `Context: ${context.hello}`
  }
}

const yoga = createYoga({ schema, context })
```

**Analysis**:
- ✅ Native support for injecting context in Resolver
- ✅ Excellent context type inference, specified through `InferResolvers`'s second type parameter
- ✅ Good IDE hints, no need for manual type declarations
- ✅ Supports extending default Context (like `YogaInitialContext`)

#### 4.7 Middleware (Middleware)

**Status: ⛔ Not Implementable**

**Evidence**:
- No related support documentation or examples found
- No middleware-related code found in `garph/src/schema.ts` and `garph/src/index.ts`

**Analysis**:
- ❌ Completely does not support middleware mechanism
- ❌ Cannot inject logic before/after Resolver execution (like logging, permission checks, performance monitoring)
- ⚠️ Can implement similar functionality by manually wrapping Resolvers, but needs additional boilerplate

#### 4.8 Query Complexity Analysis (Query Complexity)

**Status: ⛔ Not Implementable**

**Evidence**:
- No related support documentation or examples found
- No query complexity calculation and analysis related code found

**Analysis**:
- ❌ Completely does not support query complexity analysis
- ❌ Cannot prevent complex query attacks
- ⚠️ Can implement through graphql-yoga plugins, but needs additional configuration

#### 4.9 Depth Limiting (Depth Limiting)

**Status: ⛔ Not Implementable**

**Evidence**:
- No related support documentation or examples found
- No depth limiting related code found

**Analysis**:
- ❌ Completely does not support depth limiting
- ❌ Cannot prevent deep query attacks
- ⚠️ Can implement through graphql-yoga plugins, but needs additional configuration

### Built-in Features Overall Score

**Score: 3.0**

**Scoring Basis**:
- Directives: ⛔ Not Implementable (0 points) - Official documentation explicitly states not supported
- Extensions: ⚠️ Plugin/Additional Implementation (2 points) - Can implement through `GraphQLError`'s `extensions` parameter
- DataLoader: ✅ Built-in Support (5 points) - Native built-in, through `load` and `loadBatch` methods
- Scalars: ✅ Built-in Support (5 points) - Defined through `g.scalarType()`, API intuitive
- Subscription: ✅ Built-in Support (5 points) - Native support, implemented through async generator
- Context: ✅ Built-in Support (5 points) - Native support, excellent type inference
- Middleware: ⛔ Not Implementable (0 points) - Completely does not support middleware mechanism
- Query Complexity: ⛔ Not Implementable (0 points) - Completely does not support query complexity analysis
- Depth Limiting: ⛔ Not Implementable (0 points) - Completely does not support depth limiting

**Total Score: 27/45 = 3.0/5.0**

**Scoring Basis**:
- Core features well supported: Context, DataLoader, Subscriptions, Custom Scalars all provide native support
- Advanced features limited support: Directives, Middleware, Query Complexity, Depth Limiting all not supported
- Feature completeness: Out of 9 features, 4 built-in support, 1 plugin/additional implementation, 4 not implementable

**Advantages**:
1. **Core features complete**: Context, DataLoader, Subscriptions, Custom Scalars all provide native support
2. **Type safe**: All supported features have excellent type inference
3. **API concise**: Supported features have intuitive and easy-to-use APIs

**Disadvantages**:
1. **Advanced features missing**: Directives, Middleware, Query Complexity, Depth Limiting all not supported
2. **Security features insufficient**: Cannot prevent complex query attacks and deep query attacks
3. **Limited extensibility**: Lacks middleware mechanism, difficult to implement cross-cutting concerns

## 5. Ecosystem Integration (Ecosystem Integration)

### Core Integration Strategy

Garph adopts **standard GraphQL Schema output + manual integration** strategy. Outputs standard `GraphQLSchema` through `buildSchema()`, can integrate with any GraphQL Server, but needs manual adaptation. Mainly showcases integration with `graphql-yoga`, other Servers and frameworks need to integrate through standard GraphQL Server.

### Scoring Details

#### 5.1 ORM Integration Depth (ORM Integration Depth)

**Score: <-To Be Scored->**

**Evidence**:
- **No official plugins**: No official plugins found for Prisma, Drizzle, TypeORM and other ORMs
- **Needs manual integration**: All database operations in `typescript-graphql-schemas/garph/src/schema.ts` are manually implemented (using in-memory Map)
- **Type synchronization needs manual maintenance**: ORM model definitions separated from GraphQL Schema definitions, needs manual synchronization

**Code Example**:
```typescript
// Need to manually define GraphQL types
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
})

// Need to manually implement database queries
const resolvers: InferResolvers<...> = {
  Query: {
    users: () => Array.from(userMap.values()),  // Manual query
    user: (_, { id }) => userMap.get(id),      // Manual query
  },
}
```

**Analysis**:
- ❌ No official plugins: Does not provide official plugins for Prisma, Drizzle, TypeORM and other ORMs
- ❌ Needs lots of glue code: Must manually write all database query logic
- ❌ Type synchronization needs manual maintenance: ORM model definitions separated from GraphQL Schema definitions
- ⚠️ Can manually integrate: Although can manually integrate ORM, needs lots of boilerplate

#### 5.2 Validation Library Integration (Validation Library Integration)

**Score: <-To Be Scored->**

**Evidence**:
- **Supports Zod, but needs manual integration**: `garph/www/docs/advanced/validation.md` (lines 35-70) shows using Zod validation, but needs manual calls in Scalar's `parseValue`
- **Validation logic separated from Schema definition**: Validation rules cannot be directly declared in Schema definition, needs to create independent Scalar types
- **Needs manual type synchronization**: Validation rules separated from type definitions, needs manual synchronization

**Code Example**:
```typescript
// Need to manually create Scalar and call Zod
const usernameValidator = z.string().min(3)

const username = g.scalarType<string, string>('Username', {
  serialize: (username) => username,
  parseValue: (username) => {
    if (!usernameValidator.safeParse(username).success) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})
```

**Analysis**:
- ❌ No native support: Does not provide declarative validation API (like `.refine()` or `validate` option)
- ❌ Validation logic separated from Schema definition: Needs to manually call validation library in Scalar
- ❌ Needs lots of boilerplate: Each validation scenario needs to create independent Scalar types
- ⚠️ Can manually integrate: Although can manually integrate Zod, needs lots of boilerplate

#### 5.3 GraphQL Server Compatibility (Server Compatibility)

**Score: <-To Be Scored->**

**Evidence**:
- **Outputs standard GraphQL Schema**: The `buildSchema()` function in `garph/src/schema.ts` (lines 17-21) outputs standard `GraphQLSchema`
- **Compatible with standard GraphQL.js**: Uses `graphql-compose` to build Schema, ultimately outputs standard GraphQL Schema
- **Mainly showcases graphql-yoga**: `garph/www/docs/integration/server/graphql-yoga.md` provides detailed integration documentation
- **Supports other Servers**: `garph/www/docs/integration/server/apollo-server.md` and `mercurius.md` exist (although content incomplete)

**Code Example**:
```typescript
// Output standard GraphQL Schema
const schema = buildSchema({ g, resolvers })

// Can integrate with any GraphQL Server
const yoga = createYoga({ schema })  // graphql-yoga
// or
const server = new ApolloServer({ schema })  // Apollo Server
```

**Analysis**:
- ✅ Compatible with standard GraphQL.js: Outputs standard `GraphQLSchema`, can integrate into any GraphQL Server
- ✅ Not bound to specific Server: Can integrate with Apollo Server, GraphQL Yoga, Envelop, Hono, etc.
- ⚠️ Needs manual adaptation: Although compatible, needs manual adaptation, no official adapters provided
- ⚠️ Documentation mainly showcases graphql-yoga: Other Servers' integration documentation incomplete

#### 5.4 Toolchain Integration (Toolchain Integration)

**Score: <-To Be Scored->**

**Evidence**:

**TypeScript/JavaScript Support**:
- **TypeScript native**: Core files like `garph/src/index.ts`, `garph/src/schema.ts` are all written in TypeScript
- **Compiled to JavaScript**: `garph/package.json` line 10 `"main": "dist/index.js"` indicates compiled JavaScript output
- **TypeScript configuration**: `garph/tsconfig.json` shows `target: "ESNext"`, `module: "NodeNext"`, uses modern ES modules
- **All examples are TypeScript**: All example files in `garph/examples/` directory are `.ts` files, no pure JavaScript examples

**Runtime Environment Support**:
- **Node.js**: Explicitly supported. All official examples (`garph/examples/demo.ts`, `garph/examples/context.ts`, etc.) use Node.js's `createServer` and `http` modules
- **Bun**: Documentation mentions support. `garph/www/docs/integration/server/graphql-yoga.md` lines 26-28 provide `bun i graphql-yoga` installation method, `garph/www/docs/index.md` lines 41-43 also provide bun installation example
- **Deno/Cloudflare Workers**: No explicit evidence. No Deno or Cloudflare Workers examples or configurations found in source code and documentation
- **Browser**: Not supported. Core code `garph/src/schema.ts` depends on `graphql-compose` and `single-user-cache`, these dependencies may contain Node.js-specific APIs; all examples are server-side code; no browser runtime examples or documentation

**Build Tool Support**:
- **No explicit configuration**: No webpack, vite, rspack and other build tool configuration examples found in source code and documentation
- **Uses TypeScript compiler**: `garph/package.json` line 15 build script is `"build": "tsc -p tsconfig.json"`, only uses TypeScript compiler
- **Documentation uses VitePress**: `garph/package.json` lines 12-14 show documentation uses VitePress (based on Vite), but this is documentation build tool, not framework's own build tool integration

**Code Example**:
```typescript
// garph/examples/demo.ts - Node.js environment
import { g, InferResolvers, buildSchema } from '../src/index'
import { createYoga } from 'graphql-yoga'
import { createServer } from 'http'  // Node.js specific API

const schema = buildSchema({ g, resolvers })
const yoga = createYoga({ schema })
const server = createServer(yoga)  // Requires Node.js http module
server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
```

**Analysis**:
- ✅ **TypeScript native support**: Framework completely written in TypeScript, compiled to JavaScript
- ✅ **Supports Node.js and Bun**: Explicitly supports Node.js, documentation mentions Bun support
- ⚠️ **Does not support browser**: Core dependencies may contain Node.js-specific APIs, no browser runtime evidence
- ⚠️ **Deno/Cloudflare Workers support unclear**: No related examples or documentation
- ⚠️ **Build tool integration missing**: No webpack, vite, rspack and other build tool configuration examples or documentation
- ⚠️ **Mainly server-side oriented**: All examples and documentation are server-side usage scenarios

### Ecosystem Integration Overall Score

**Score: 2.0**

**Scoring Basis**:
- ORM integration depth: 2.0 (weak integration, needs lots of glue code)
- Validation library integration: 2.0 (weak integration, needs lots of boilerplate)
- GraphQL Server compatibility: 3.0 (standard compatible, but needs manual adaptation)
- Toolchain integration: 2.0 (mainly supports TypeScript and Node.js/Bun, does not support browser, build tool integration missing)

**Advantages**:
1. **Standard compatible**: Outputs standard GraphQL Schema, can integrate with any GraphQL Server
2. **Not bound to specific Server**: Can integrate with Apollo Server, GraphQL Yoga, Envelop, etc.
3. **Has example references**: Provides Next.js, Nuxt, Remix integration examples

**Disadvantages**:
1. **Weak ORM integration**: No official plugins, needs lots of glue code
2. **Weak validation library integration**: Needs manual integration, validation logic separated from Schema definition
3. **Limited toolchain support**: Does not support browser environment, Deno/Cloudflare Workers support unclear, no build tool integration examples
4. **Mainly server-side oriented**: All examples and documentation are server-side usage scenarios, client-side usage limited
5. **Limited integration documentation**: Mainly showcases graphql-yoga, other Servers and frameworks' documentation incomplete

## 📝 Summary

### Overall Score: 2.7/5.0

| Dimension              | Score | Description                                                                       |
| ---------------------- | ----- | --------------------------------------------------------------------------------- |
| Architecture Pattern   | 4.5   | Builder pattern, zero magic, write and use immediately, lightweight dependencies  |
| Type Definition        | 3.5   | Deep inference, smart inheritance, flexible enums, Union requires manual handling |
| Resolvers & Validation | 2.9   | Automatic parameter inference, native DataLoader, no built-in validation          |
| Built-in Features      | 3.0   | Core features complete, advanced features missing, security features insufficient |
| Ecosystem Integration  | 2.0   | Standard compatible, weak ORM/validation integration, no official adapters        |

### Overall Evaluation

Garph adopts the Builder pattern, achieving a zero magic, write-and-use-immediately design philosophy. Lightweight dependencies, pure runtime building, supports hot reload, excellent development experience. Native DataLoader support is a highlight, almost no boilerplate. But has limited support in validation, modularization, advanced features (Directives, Middleware, query complexity, depth limiting), and weak ORM and validation library integration.

### Core Advantages

1. **Zero magic design**: No need for decorators, reflection metadata, or code generation, fully compliant with native TypeScript best practices
2. **Write and use immediately**: Pure runtime building, supports hot reload, fast development iteration
3. **DataLoader native support**: Built-in batch loading, almost no boilerplate, automatic batch processing and caching
4. **Type safety**: End-to-end type safety, excellent type inference from Schema to Resolver
5. **Lightweight dependencies**: Only depends on `graphql-compose` and `single-user-cache`, lighter than decorator pattern

### Main Disadvantages

1. **No built-in validation**: Needs to manually write all validation logic, validation code repetitive, validation logic scattered
2. **Limited modular support**: Organized by operation type (Query, Mutation, Type), doesn't enforce modularization, easy to write coupled code
3. **Advanced features missing**: Directives, Middleware, Query Complexity, Depth Limiting all not supported
4. **Weak ORM/validation library integration**: No official plugins, needs lots of glue code, type synchronization needs manual maintenance
5. **Requires explicit type annotations**: Resolver object needs to add `InferResolvers` type annotation

### Use Cases

#### Recommended For

- Small to medium projects, need quick startup and iteration
- Teams that need zero magic, write-and-use-immediately, prefer native TypeScript practices
- Projects with strong DataLoader requirements
- Projects that don't need Directives or Middleware

#### Not Recommended For

- Projects that need Directives or Middleware
- Projects that need deep ORM integration
- Projects that need declarative validation
- Projects that need query complexity analysis or depth limiting

### Improvement Suggestions

1. **Provide declarative validation API**: Support declarative validation like `.refine()`, reduce manual validation code
2. **Enhance modular support**: Provide domain-organized API, enforce module boundaries, avoid coupling
3. **Provide Directives and Middleware support**: Meet advanced feature requirements
4. **Provide official plugins for ORM and validation libraries**: Reduce glue code, improve integration
5. **Reduce explicit type annotation requirements**: Reduce `InferResolvers` annotations through better type inference

---

**Evaluation Date**: January 2026  
**Evaluation Version**: garph@0.6.8  
**Evaluation Method**: Deep source code audit based on actual business code and official examples