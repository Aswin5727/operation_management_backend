
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model LoginEvent
 * 
 */
export type LoginEvent = $Result.DefaultSelection<Prisma.$LoginEventPayload>
/**
 * Model PasswordResetToken
 * 
 */
export type PasswordResetToken = $Result.DefaultSelection<Prisma.$PasswordResetTokenPayload>
/**
 * Model Course
 * 
 */
export type Course = $Result.DefaultSelection<Prisma.$CoursePayload>
/**
 * Model CourseModule
 * 
 */
export type CourseModule = $Result.DefaultSelection<Prisma.$CourseModulePayload>
/**
 * Model Batch
 * 
 */
export type Batch = $Result.DefaultSelection<Prisma.$BatchPayload>
/**
 * Model BatchFacultyAssignment
 * 
 */
export type BatchFacultyAssignment = $Result.DefaultSelection<Prisma.$BatchFacultyAssignmentPayload>
/**
 * Model CourseStatusHistory
 * 
 */
export type CourseStatusHistory = $Result.DefaultSelection<Prisma.$CourseStatusHistoryPayload>
/**
 * Model BatchStatusHistory
 * 
 */
export type BatchStatusHistory = $Result.DefaultSelection<Prisma.$BatchStatusHistoryPayload>
/**
 * Model StudentProfile
 * 
 */
export type StudentProfile = $Result.DefaultSelection<Prisma.$StudentProfilePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  OPERATION_MANAGER: 'OPERATION_MANAGER',
  HR: 'HR',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const LoginEventType: {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  REFRESH: 'REFRESH',
  LOGOUT: 'LOGOUT',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  RESET_PASSWORD_REQUESTED: 'RESET_PASSWORD_REQUESTED',
  RESET_PASSWORD_COMPLETED: 'RESET_PASSWORD_COMPLETED'
};

export type LoginEventType = (typeof LoginEventType)[keyof typeof LoginEventType]


export const RecordStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus]


export const BatchStatus: {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  INACTIVE: 'INACTIVE'
};

export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus]


export const AssignmentStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type LoginEventType = $Enums.LoginEventType

export const LoginEventType: typeof $Enums.LoginEventType

export type RecordStatus = $Enums.RecordStatus

export const RecordStatus: typeof $Enums.RecordStatus

export type BatchStatus = $Enums.BatchStatus

export const BatchStatus: typeof $Enums.BatchStatus

export type AssignmentStatus = $Enums.AssignmentStatus

export const AssignmentStatus: typeof $Enums.AssignmentStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.loginEvent`: Exposes CRUD operations for the **LoginEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LoginEvents
    * const loginEvents = await prisma.loginEvent.findMany()
    * ```
    */
  get loginEvent(): Prisma.LoginEventDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.passwordResetToken`: Exposes CRUD operations for the **PasswordResetToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PasswordResetTokens
    * const passwordResetTokens = await prisma.passwordResetToken.findMany()
    * ```
    */
  get passwordResetToken(): Prisma.PasswordResetTokenDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.course`: Exposes CRUD operations for the **Course** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Courses
    * const courses = await prisma.course.findMany()
    * ```
    */
  get course(): Prisma.CourseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.courseModule`: Exposes CRUD operations for the **CourseModule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CourseModules
    * const courseModules = await prisma.courseModule.findMany()
    * ```
    */
  get courseModule(): Prisma.CourseModuleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.batch`: Exposes CRUD operations for the **Batch** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Batches
    * const batches = await prisma.batch.findMany()
    * ```
    */
  get batch(): Prisma.BatchDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.batchFacultyAssignment`: Exposes CRUD operations for the **BatchFacultyAssignment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BatchFacultyAssignments
    * const batchFacultyAssignments = await prisma.batchFacultyAssignment.findMany()
    * ```
    */
  get batchFacultyAssignment(): Prisma.BatchFacultyAssignmentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.courseStatusHistory`: Exposes CRUD operations for the **CourseStatusHistory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CourseStatusHistories
    * const courseStatusHistories = await prisma.courseStatusHistory.findMany()
    * ```
    */
  get courseStatusHistory(): Prisma.CourseStatusHistoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.batchStatusHistory`: Exposes CRUD operations for the **BatchStatusHistory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BatchStatusHistories
    * const batchStatusHistories = await prisma.batchStatusHistory.findMany()
    * ```
    */
  get batchStatusHistory(): Prisma.BatchStatusHistoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.studentProfile`: Exposes CRUD operations for the **StudentProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more StudentProfiles
    * const studentProfiles = await prisma.studentProfile.findMany()
    * ```
    */
  get studentProfile(): Prisma.StudentProfileDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    LoginEvent: 'LoginEvent',
    PasswordResetToken: 'PasswordResetToken',
    Course: 'Course',
    CourseModule: 'CourseModule',
    Batch: 'Batch',
    BatchFacultyAssignment: 'BatchFacultyAssignment',
    CourseStatusHistory: 'CourseStatusHistory',
    BatchStatusHistory: 'BatchStatusHistory',
    StudentProfile: 'StudentProfile'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "loginEvent" | "passwordResetToken" | "course" | "courseModule" | "batch" | "batchFacultyAssignment" | "courseStatusHistory" | "batchStatusHistory" | "studentProfile"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      LoginEvent: {
        payload: Prisma.$LoginEventPayload<ExtArgs>
        fields: Prisma.LoginEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LoginEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LoginEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          findFirst: {
            args: Prisma.LoginEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LoginEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          findMany: {
            args: Prisma.LoginEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>[]
          }
          create: {
            args: Prisma.LoginEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          createMany: {
            args: Prisma.LoginEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LoginEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>[]
          }
          delete: {
            args: Prisma.LoginEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          update: {
            args: Prisma.LoginEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          deleteMany: {
            args: Prisma.LoginEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LoginEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.LoginEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>[]
          }
          upsert: {
            args: Prisma.LoginEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LoginEventPayload>
          }
          aggregate: {
            args: Prisma.LoginEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLoginEvent>
          }
          groupBy: {
            args: Prisma.LoginEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<LoginEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.LoginEventCountArgs<ExtArgs>
            result: $Utils.Optional<LoginEventCountAggregateOutputType> | number
          }
        }
      }
      PasswordResetToken: {
        payload: Prisma.$PasswordResetTokenPayload<ExtArgs>
        fields: Prisma.PasswordResetTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PasswordResetTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PasswordResetTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          findFirst: {
            args: Prisma.PasswordResetTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PasswordResetTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          findMany: {
            args: Prisma.PasswordResetTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[]
          }
          create: {
            args: Prisma.PasswordResetTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          createMany: {
            args: Prisma.PasswordResetTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PasswordResetTokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[]
          }
          delete: {
            args: Prisma.PasswordResetTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          update: {
            args: Prisma.PasswordResetTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          deleteMany: {
            args: Prisma.PasswordResetTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PasswordResetTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PasswordResetTokenUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[]
          }
          upsert: {
            args: Prisma.PasswordResetTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>
          }
          aggregate: {
            args: Prisma.PasswordResetTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePasswordResetToken>
          }
          groupBy: {
            args: Prisma.PasswordResetTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<PasswordResetTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.PasswordResetTokenCountArgs<ExtArgs>
            result: $Utils.Optional<PasswordResetTokenCountAggregateOutputType> | number
          }
        }
      }
      Course: {
        payload: Prisma.$CoursePayload<ExtArgs>
        fields: Prisma.CourseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          findFirst: {
            args: Prisma.CourseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          findMany: {
            args: Prisma.CourseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          create: {
            args: Prisma.CourseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          createMany: {
            args: Prisma.CourseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          delete: {
            args: Prisma.CourseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          update: {
            args: Prisma.CourseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          deleteMany: {
            args: Prisma.CourseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourseUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          upsert: {
            args: Prisma.CourseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          aggregate: {
            args: Prisma.CourseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCourse>
          }
          groupBy: {
            args: Prisma.CourseGroupByArgs<ExtArgs>
            result: $Utils.Optional<CourseGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourseCountArgs<ExtArgs>
            result: $Utils.Optional<CourseCountAggregateOutputType> | number
          }
        }
      }
      CourseModule: {
        payload: Prisma.$CourseModulePayload<ExtArgs>
        fields: Prisma.CourseModuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourseModuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourseModuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          findFirst: {
            args: Prisma.CourseModuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourseModuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          findMany: {
            args: Prisma.CourseModuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>[]
          }
          create: {
            args: Prisma.CourseModuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          createMany: {
            args: Prisma.CourseModuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourseModuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>[]
          }
          delete: {
            args: Prisma.CourseModuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          update: {
            args: Prisma.CourseModuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          deleteMany: {
            args: Prisma.CourseModuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourseModuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourseModuleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>[]
          }
          upsert: {
            args: Prisma.CourseModuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseModulePayload>
          }
          aggregate: {
            args: Prisma.CourseModuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCourseModule>
          }
          groupBy: {
            args: Prisma.CourseModuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<CourseModuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourseModuleCountArgs<ExtArgs>
            result: $Utils.Optional<CourseModuleCountAggregateOutputType> | number
          }
        }
      }
      Batch: {
        payload: Prisma.$BatchPayload<ExtArgs>
        fields: Prisma.BatchFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BatchFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BatchFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          findFirst: {
            args: Prisma.BatchFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BatchFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          findMany: {
            args: Prisma.BatchFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>[]
          }
          create: {
            args: Prisma.BatchCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          createMany: {
            args: Prisma.BatchCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BatchCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>[]
          }
          delete: {
            args: Prisma.BatchDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          update: {
            args: Prisma.BatchUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          deleteMany: {
            args: Prisma.BatchDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BatchUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BatchUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>[]
          }
          upsert: {
            args: Prisma.BatchUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchPayload>
          }
          aggregate: {
            args: Prisma.BatchAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBatch>
          }
          groupBy: {
            args: Prisma.BatchGroupByArgs<ExtArgs>
            result: $Utils.Optional<BatchGroupByOutputType>[]
          }
          count: {
            args: Prisma.BatchCountArgs<ExtArgs>
            result: $Utils.Optional<BatchCountAggregateOutputType> | number
          }
        }
      }
      BatchFacultyAssignment: {
        payload: Prisma.$BatchFacultyAssignmentPayload<ExtArgs>
        fields: Prisma.BatchFacultyAssignmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BatchFacultyAssignmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BatchFacultyAssignmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          findFirst: {
            args: Prisma.BatchFacultyAssignmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BatchFacultyAssignmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          findMany: {
            args: Prisma.BatchFacultyAssignmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>[]
          }
          create: {
            args: Prisma.BatchFacultyAssignmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          createMany: {
            args: Prisma.BatchFacultyAssignmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BatchFacultyAssignmentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>[]
          }
          delete: {
            args: Prisma.BatchFacultyAssignmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          update: {
            args: Prisma.BatchFacultyAssignmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          deleteMany: {
            args: Prisma.BatchFacultyAssignmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BatchFacultyAssignmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BatchFacultyAssignmentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>[]
          }
          upsert: {
            args: Prisma.BatchFacultyAssignmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchFacultyAssignmentPayload>
          }
          aggregate: {
            args: Prisma.BatchFacultyAssignmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBatchFacultyAssignment>
          }
          groupBy: {
            args: Prisma.BatchFacultyAssignmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<BatchFacultyAssignmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.BatchFacultyAssignmentCountArgs<ExtArgs>
            result: $Utils.Optional<BatchFacultyAssignmentCountAggregateOutputType> | number
          }
        }
      }
      CourseStatusHistory: {
        payload: Prisma.$CourseStatusHistoryPayload<ExtArgs>
        fields: Prisma.CourseStatusHistoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourseStatusHistoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourseStatusHistoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          findFirst: {
            args: Prisma.CourseStatusHistoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourseStatusHistoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          findMany: {
            args: Prisma.CourseStatusHistoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>[]
          }
          create: {
            args: Prisma.CourseStatusHistoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          createMany: {
            args: Prisma.CourseStatusHistoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourseStatusHistoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>[]
          }
          delete: {
            args: Prisma.CourseStatusHistoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          update: {
            args: Prisma.CourseStatusHistoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          deleteMany: {
            args: Prisma.CourseStatusHistoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourseStatusHistoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourseStatusHistoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>[]
          }
          upsert: {
            args: Prisma.CourseStatusHistoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CourseStatusHistoryPayload>
          }
          aggregate: {
            args: Prisma.CourseStatusHistoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCourseStatusHistory>
          }
          groupBy: {
            args: Prisma.CourseStatusHistoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<CourseStatusHistoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourseStatusHistoryCountArgs<ExtArgs>
            result: $Utils.Optional<CourseStatusHistoryCountAggregateOutputType> | number
          }
        }
      }
      BatchStatusHistory: {
        payload: Prisma.$BatchStatusHistoryPayload<ExtArgs>
        fields: Prisma.BatchStatusHistoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BatchStatusHistoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BatchStatusHistoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          findFirst: {
            args: Prisma.BatchStatusHistoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BatchStatusHistoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          findMany: {
            args: Prisma.BatchStatusHistoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>[]
          }
          create: {
            args: Prisma.BatchStatusHistoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          createMany: {
            args: Prisma.BatchStatusHistoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BatchStatusHistoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>[]
          }
          delete: {
            args: Prisma.BatchStatusHistoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          update: {
            args: Prisma.BatchStatusHistoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          deleteMany: {
            args: Prisma.BatchStatusHistoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BatchStatusHistoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BatchStatusHistoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>[]
          }
          upsert: {
            args: Prisma.BatchStatusHistoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BatchStatusHistoryPayload>
          }
          aggregate: {
            args: Prisma.BatchStatusHistoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBatchStatusHistory>
          }
          groupBy: {
            args: Prisma.BatchStatusHistoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<BatchStatusHistoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.BatchStatusHistoryCountArgs<ExtArgs>
            result: $Utils.Optional<BatchStatusHistoryCountAggregateOutputType> | number
          }
        }
      }
      StudentProfile: {
        payload: Prisma.$StudentProfilePayload<ExtArgs>
        fields: Prisma.StudentProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.StudentProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.StudentProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          findFirst: {
            args: Prisma.StudentProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.StudentProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          findMany: {
            args: Prisma.StudentProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>[]
          }
          create: {
            args: Prisma.StudentProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          createMany: {
            args: Prisma.StudentProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.StudentProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>[]
          }
          delete: {
            args: Prisma.StudentProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          update: {
            args: Prisma.StudentProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          deleteMany: {
            args: Prisma.StudentProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.StudentProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.StudentProfileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>[]
          }
          upsert: {
            args: Prisma.StudentProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$StudentProfilePayload>
          }
          aggregate: {
            args: Prisma.StudentProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateStudentProfile>
          }
          groupBy: {
            args: Prisma.StudentProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<StudentProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.StudentProfileCountArgs<ExtArgs>
            result: $Utils.Optional<StudentProfileCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    loginEvent?: LoginEventOmit
    passwordResetToken?: PasswordResetTokenOmit
    course?: CourseOmit
    courseModule?: CourseModuleOmit
    batch?: BatchOmit
    batchFacultyAssignment?: BatchFacultyAssignmentOmit
    courseStatusHistory?: CourseStatusHistoryOmit
    batchStatusHistory?: BatchStatusHistoryOmit
    studentProfile?: StudentProfileOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    loginEvents: number
    passwordResetTokens: number
    batchFacultyAssignments: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    loginEvents?: boolean | UserCountOutputTypeCountLoginEventsArgs
    passwordResetTokens?: boolean | UserCountOutputTypeCountPasswordResetTokensArgs
    batchFacultyAssignments?: boolean | UserCountOutputTypeCountBatchFacultyAssignmentsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLoginEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LoginEventWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPasswordResetTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PasswordResetTokenWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountBatchFacultyAssignmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchFacultyAssignmentWhereInput
  }


  /**
   * Count Type CourseCountOutputType
   */

  export type CourseCountOutputType = {
    modules: number
    batches: number
    students: number
    statusHistory: number
  }

  export type CourseCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    modules?: boolean | CourseCountOutputTypeCountModulesArgs
    batches?: boolean | CourseCountOutputTypeCountBatchesArgs
    students?: boolean | CourseCountOutputTypeCountStudentsArgs
    statusHistory?: boolean | CourseCountOutputTypeCountStatusHistoryArgs
  }

  // Custom InputTypes
  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseCountOutputType
     */
    select?: CourseCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountModulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourseModuleWhereInput
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountBatchesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchWhereInput
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountStudentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudentProfileWhereInput
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountStatusHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourseStatusHistoryWhereInput
  }


  /**
   * Count Type BatchCountOutputType
   */

  export type BatchCountOutputType = {
    facultyAssignments: number
    statusHistory: number
  }

  export type BatchCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    facultyAssignments?: boolean | BatchCountOutputTypeCountFacultyAssignmentsArgs
    statusHistory?: boolean | BatchCountOutputTypeCountStatusHistoryArgs
  }

  // Custom InputTypes
  /**
   * BatchCountOutputType without action
   */
  export type BatchCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchCountOutputType
     */
    select?: BatchCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * BatchCountOutputType without action
   */
  export type BatchCountOutputTypeCountFacultyAssignmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchFacultyAssignmentWhereInput
  }

  /**
   * BatchCountOutputType without action
   */
  export type BatchCountOutputTypeCountStatusHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchStatusHistoryWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    refreshTokenVersion: number | null
    failedLoginCount: number | null
  }

  export type UserSumAggregateOutputType = {
    refreshTokenVersion: number | null
    failedLoginCount: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    userCode: string | null
    fullName: string | null
    email: string | null
    phone: string | null
    role: $Enums.UserRole | null
    active: boolean | null
    passwordHash: string | null
    passwordChangedAt: Date | null
    refreshTokenVersion: number | null
    failedLoginCount: number | null
    failedLoginWindowExpiresAt: Date | null
    lockedUntil: Date | null
    lastLoginAt: Date | null
    lastLogoutAt: Date | null
    lastLoginIp: string | null
    lastLoginUserAgent: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    userCode: string | null
    fullName: string | null
    email: string | null
    phone: string | null
    role: $Enums.UserRole | null
    active: boolean | null
    passwordHash: string | null
    passwordChangedAt: Date | null
    refreshTokenVersion: number | null
    failedLoginCount: number | null
    failedLoginWindowExpiresAt: Date | null
    lockedUntil: Date | null
    lastLoginAt: Date | null
    lastLogoutAt: Date | null
    lastLoginIp: string | null
    lastLoginUserAgent: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    userCode: number
    fullName: number
    email: number
    phone: number
    role: number
    active: number
    passwordHash: number
    passwordChangedAt: number
    refreshTokenVersion: number
    failedLoginCount: number
    failedLoginWindowExpiresAt: number
    lockedUntil: number
    lastLoginAt: number
    lastLogoutAt: number
    lastLoginIp: number
    lastLoginUserAgent: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    refreshTokenVersion?: true
    failedLoginCount?: true
  }

  export type UserSumAggregateInputType = {
    refreshTokenVersion?: true
    failedLoginCount?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    userCode?: true
    fullName?: true
    email?: true
    phone?: true
    role?: true
    active?: true
    passwordHash?: true
    passwordChangedAt?: true
    refreshTokenVersion?: true
    failedLoginCount?: true
    failedLoginWindowExpiresAt?: true
    lockedUntil?: true
    lastLoginAt?: true
    lastLogoutAt?: true
    lastLoginIp?: true
    lastLoginUserAgent?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    userCode?: true
    fullName?: true
    email?: true
    phone?: true
    role?: true
    active?: true
    passwordHash?: true
    passwordChangedAt?: true
    refreshTokenVersion?: true
    failedLoginCount?: true
    failedLoginWindowExpiresAt?: true
    lockedUntil?: true
    lastLoginAt?: true
    lastLogoutAt?: true
    lastLoginIp?: true
    lastLoginUserAgent?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    userCode?: true
    fullName?: true
    email?: true
    phone?: true
    role?: true
    active?: true
    passwordHash?: true
    passwordChangedAt?: true
    refreshTokenVersion?: true
    failedLoginCount?: true
    failedLoginWindowExpiresAt?: true
    lockedUntil?: true
    lastLoginAt?: true
    lastLogoutAt?: true
    lastLoginIp?: true
    lastLoginUserAgent?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    userCode: string
    fullName: string
    email: string
    phone: string | null
    role: $Enums.UserRole
    active: boolean
    passwordHash: string
    passwordChangedAt: Date | null
    refreshTokenVersion: number
    failedLoginCount: number
    failedLoginWindowExpiresAt: Date | null
    lockedUntil: Date | null
    lastLoginAt: Date | null
    lastLogoutAt: Date | null
    lastLoginIp: string | null
    lastLoginUserAgent: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userCode?: boolean
    fullName?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    active?: boolean
    passwordHash?: boolean
    passwordChangedAt?: boolean
    refreshTokenVersion?: boolean
    failedLoginCount?: boolean
    failedLoginWindowExpiresAt?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    lastLogoutAt?: boolean
    lastLoginIp?: boolean
    lastLoginUserAgent?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    loginEvents?: boolean | User$loginEventsArgs<ExtArgs>
    passwordResetTokens?: boolean | User$passwordResetTokensArgs<ExtArgs>
    batchFacultyAssignments?: boolean | User$batchFacultyAssignmentsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userCode?: boolean
    fullName?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    active?: boolean
    passwordHash?: boolean
    passwordChangedAt?: boolean
    refreshTokenVersion?: boolean
    failedLoginCount?: boolean
    failedLoginWindowExpiresAt?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    lastLogoutAt?: boolean
    lastLoginIp?: boolean
    lastLoginUserAgent?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userCode?: boolean
    fullName?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    active?: boolean
    passwordHash?: boolean
    passwordChangedAt?: boolean
    refreshTokenVersion?: boolean
    failedLoginCount?: boolean
    failedLoginWindowExpiresAt?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    lastLogoutAt?: boolean
    lastLoginIp?: boolean
    lastLoginUserAgent?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    userCode?: boolean
    fullName?: boolean
    email?: boolean
    phone?: boolean
    role?: boolean
    active?: boolean
    passwordHash?: boolean
    passwordChangedAt?: boolean
    refreshTokenVersion?: boolean
    failedLoginCount?: boolean
    failedLoginWindowExpiresAt?: boolean
    lockedUntil?: boolean
    lastLoginAt?: boolean
    lastLogoutAt?: boolean
    lastLoginIp?: boolean
    lastLoginUserAgent?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userCode" | "fullName" | "email" | "phone" | "role" | "active" | "passwordHash" | "passwordChangedAt" | "refreshTokenVersion" | "failedLoginCount" | "failedLoginWindowExpiresAt" | "lockedUntil" | "lastLoginAt" | "lastLogoutAt" | "lastLoginIp" | "lastLoginUserAgent" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    loginEvents?: boolean | User$loginEventsArgs<ExtArgs>
    passwordResetTokens?: boolean | User$passwordResetTokensArgs<ExtArgs>
    batchFacultyAssignments?: boolean | User$batchFacultyAssignmentsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      loginEvents: Prisma.$LoginEventPayload<ExtArgs>[]
      passwordResetTokens: Prisma.$PasswordResetTokenPayload<ExtArgs>[]
      batchFacultyAssignments: Prisma.$BatchFacultyAssignmentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userCode: string
      fullName: string
      email: string
      phone: string | null
      role: $Enums.UserRole
      active: boolean
      passwordHash: string
      passwordChangedAt: Date | null
      refreshTokenVersion: number
      failedLoginCount: number
      failedLoginWindowExpiresAt: Date | null
      lockedUntil: Date | null
      lastLoginAt: Date | null
      lastLogoutAt: Date | null
      lastLoginIp: string | null
      lastLoginUserAgent: string | null
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    loginEvents<T extends User$loginEventsArgs<ExtArgs> = {}>(args?: Subset<T, User$loginEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    passwordResetTokens<T extends User$passwordResetTokensArgs<ExtArgs> = {}>(args?: Subset<T, User$passwordResetTokensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    batchFacultyAssignments<T extends User$batchFacultyAssignmentsArgs<ExtArgs> = {}>(args?: Subset<T, User$batchFacultyAssignmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly userCode: FieldRef<"User", 'String'>
    readonly fullName: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly active: FieldRef<"User", 'Boolean'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly passwordChangedAt: FieldRef<"User", 'DateTime'>
    readonly refreshTokenVersion: FieldRef<"User", 'Int'>
    readonly failedLoginCount: FieldRef<"User", 'Int'>
    readonly failedLoginWindowExpiresAt: FieldRef<"User", 'DateTime'>
    readonly lockedUntil: FieldRef<"User", 'DateTime'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
    readonly lastLogoutAt: FieldRef<"User", 'DateTime'>
    readonly lastLoginIp: FieldRef<"User", 'String'>
    readonly lastLoginUserAgent: FieldRef<"User", 'String'>
    readonly createdBy: FieldRef<"User", 'String'>
    readonly updatedBy: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.loginEvents
   */
  export type User$loginEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    where?: LoginEventWhereInput
    orderBy?: LoginEventOrderByWithRelationInput | LoginEventOrderByWithRelationInput[]
    cursor?: LoginEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LoginEventScalarFieldEnum | LoginEventScalarFieldEnum[]
  }

  /**
   * User.passwordResetTokens
   */
  export type User$passwordResetTokensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    where?: PasswordResetTokenWhereInput
    orderBy?: PasswordResetTokenOrderByWithRelationInput | PasswordResetTokenOrderByWithRelationInput[]
    cursor?: PasswordResetTokenWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PasswordResetTokenScalarFieldEnum | PasswordResetTokenScalarFieldEnum[]
  }

  /**
   * User.batchFacultyAssignments
   */
  export type User$batchFacultyAssignmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    where?: BatchFacultyAssignmentWhereInput
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BatchFacultyAssignmentScalarFieldEnum | BatchFacultyAssignmentScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model LoginEvent
   */

  export type AggregateLoginEvent = {
    _count: LoginEventCountAggregateOutputType | null
    _min: LoginEventMinAggregateOutputType | null
    _max: LoginEventMaxAggregateOutputType | null
  }

  export type LoginEventMinAggregateOutputType = {
    id: string | null
    userId: string | null
    eventType: $Enums.LoginEventType | null
    success: boolean | null
    ipAddress: string | null
    userAgent: string | null
    reason: string | null
    createdAt: Date | null
  }

  export type LoginEventMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    eventType: $Enums.LoginEventType | null
    success: boolean | null
    ipAddress: string | null
    userAgent: string | null
    reason: string | null
    createdAt: Date | null
  }

  export type LoginEventCountAggregateOutputType = {
    id: number
    userId: number
    eventType: number
    success: number
    ipAddress: number
    userAgent: number
    reason: number
    meta: number
    createdAt: number
    _all: number
  }


  export type LoginEventMinAggregateInputType = {
    id?: true
    userId?: true
    eventType?: true
    success?: true
    ipAddress?: true
    userAgent?: true
    reason?: true
    createdAt?: true
  }

  export type LoginEventMaxAggregateInputType = {
    id?: true
    userId?: true
    eventType?: true
    success?: true
    ipAddress?: true
    userAgent?: true
    reason?: true
    createdAt?: true
  }

  export type LoginEventCountAggregateInputType = {
    id?: true
    userId?: true
    eventType?: true
    success?: true
    ipAddress?: true
    userAgent?: true
    reason?: true
    meta?: true
    createdAt?: true
    _all?: true
  }

  export type LoginEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LoginEvent to aggregate.
     */
    where?: LoginEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LoginEvents to fetch.
     */
    orderBy?: LoginEventOrderByWithRelationInput | LoginEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LoginEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LoginEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LoginEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LoginEvents
    **/
    _count?: true | LoginEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LoginEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LoginEventMaxAggregateInputType
  }

  export type GetLoginEventAggregateType<T extends LoginEventAggregateArgs> = {
        [P in keyof T & keyof AggregateLoginEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLoginEvent[P]>
      : GetScalarType<T[P], AggregateLoginEvent[P]>
  }




  export type LoginEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LoginEventWhereInput
    orderBy?: LoginEventOrderByWithAggregationInput | LoginEventOrderByWithAggregationInput[]
    by: LoginEventScalarFieldEnum[] | LoginEventScalarFieldEnum
    having?: LoginEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LoginEventCountAggregateInputType | true
    _min?: LoginEventMinAggregateInputType
    _max?: LoginEventMaxAggregateInputType
  }

  export type LoginEventGroupByOutputType = {
    id: string
    userId: string | null
    eventType: $Enums.LoginEventType
    success: boolean
    ipAddress: string | null
    userAgent: string | null
    reason: string | null
    meta: JsonValue | null
    createdAt: Date
    _count: LoginEventCountAggregateOutputType | null
    _min: LoginEventMinAggregateOutputType | null
    _max: LoginEventMaxAggregateOutputType | null
  }

  type GetLoginEventGroupByPayload<T extends LoginEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LoginEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LoginEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LoginEventGroupByOutputType[P]>
            : GetScalarType<T[P], LoginEventGroupByOutputType[P]>
        }
      >
    >


  export type LoginEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    eventType?: boolean
    success?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    reason?: boolean
    meta?: boolean
    createdAt?: boolean
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }, ExtArgs["result"]["loginEvent"]>

  export type LoginEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    eventType?: boolean
    success?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    reason?: boolean
    meta?: boolean
    createdAt?: boolean
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }, ExtArgs["result"]["loginEvent"]>

  export type LoginEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    eventType?: boolean
    success?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    reason?: boolean
    meta?: boolean
    createdAt?: boolean
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }, ExtArgs["result"]["loginEvent"]>

  export type LoginEventSelectScalar = {
    id?: boolean
    userId?: boolean
    eventType?: boolean
    success?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    reason?: boolean
    meta?: boolean
    createdAt?: boolean
  }

  export type LoginEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "eventType" | "success" | "ipAddress" | "userAgent" | "reason" | "meta" | "createdAt", ExtArgs["result"]["loginEvent"]>
  export type LoginEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }
  export type LoginEventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }
  export type LoginEventIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | LoginEvent$userArgs<ExtArgs>
  }

  export type $LoginEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LoginEvent"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      eventType: $Enums.LoginEventType
      success: boolean
      ipAddress: string | null
      userAgent: string | null
      reason: string | null
      meta: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["loginEvent"]>
    composites: {}
  }

  type LoginEventGetPayload<S extends boolean | null | undefined | LoginEventDefaultArgs> = $Result.GetResult<Prisma.$LoginEventPayload, S>

  type LoginEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<LoginEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: LoginEventCountAggregateInputType | true
    }

  export interface LoginEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LoginEvent'], meta: { name: 'LoginEvent' } }
    /**
     * Find zero or one LoginEvent that matches the filter.
     * @param {LoginEventFindUniqueArgs} args - Arguments to find a LoginEvent
     * @example
     * // Get one LoginEvent
     * const loginEvent = await prisma.loginEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LoginEventFindUniqueArgs>(args: SelectSubset<T, LoginEventFindUniqueArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one LoginEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {LoginEventFindUniqueOrThrowArgs} args - Arguments to find a LoginEvent
     * @example
     * // Get one LoginEvent
     * const loginEvent = await prisma.loginEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LoginEventFindUniqueOrThrowArgs>(args: SelectSubset<T, LoginEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LoginEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventFindFirstArgs} args - Arguments to find a LoginEvent
     * @example
     * // Get one LoginEvent
     * const loginEvent = await prisma.loginEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LoginEventFindFirstArgs>(args?: SelectSubset<T, LoginEventFindFirstArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first LoginEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventFindFirstOrThrowArgs} args - Arguments to find a LoginEvent
     * @example
     * // Get one LoginEvent
     * const loginEvent = await prisma.loginEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LoginEventFindFirstOrThrowArgs>(args?: SelectSubset<T, LoginEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more LoginEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LoginEvents
     * const loginEvents = await prisma.loginEvent.findMany()
     * 
     * // Get first 10 LoginEvents
     * const loginEvents = await prisma.loginEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const loginEventWithIdOnly = await prisma.loginEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LoginEventFindManyArgs>(args?: SelectSubset<T, LoginEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a LoginEvent.
     * @param {LoginEventCreateArgs} args - Arguments to create a LoginEvent.
     * @example
     * // Create one LoginEvent
     * const LoginEvent = await prisma.loginEvent.create({
     *   data: {
     *     // ... data to create a LoginEvent
     *   }
     * })
     * 
     */
    create<T extends LoginEventCreateArgs>(args: SelectSubset<T, LoginEventCreateArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many LoginEvents.
     * @param {LoginEventCreateManyArgs} args - Arguments to create many LoginEvents.
     * @example
     * // Create many LoginEvents
     * const loginEvent = await prisma.loginEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LoginEventCreateManyArgs>(args?: SelectSubset<T, LoginEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LoginEvents and returns the data saved in the database.
     * @param {LoginEventCreateManyAndReturnArgs} args - Arguments to create many LoginEvents.
     * @example
     * // Create many LoginEvents
     * const loginEvent = await prisma.loginEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LoginEvents and only return the `id`
     * const loginEventWithIdOnly = await prisma.loginEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LoginEventCreateManyAndReturnArgs>(args?: SelectSubset<T, LoginEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a LoginEvent.
     * @param {LoginEventDeleteArgs} args - Arguments to delete one LoginEvent.
     * @example
     * // Delete one LoginEvent
     * const LoginEvent = await prisma.loginEvent.delete({
     *   where: {
     *     // ... filter to delete one LoginEvent
     *   }
     * })
     * 
     */
    delete<T extends LoginEventDeleteArgs>(args: SelectSubset<T, LoginEventDeleteArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one LoginEvent.
     * @param {LoginEventUpdateArgs} args - Arguments to update one LoginEvent.
     * @example
     * // Update one LoginEvent
     * const loginEvent = await prisma.loginEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LoginEventUpdateArgs>(args: SelectSubset<T, LoginEventUpdateArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more LoginEvents.
     * @param {LoginEventDeleteManyArgs} args - Arguments to filter LoginEvents to delete.
     * @example
     * // Delete a few LoginEvents
     * const { count } = await prisma.loginEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LoginEventDeleteManyArgs>(args?: SelectSubset<T, LoginEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LoginEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LoginEvents
     * const loginEvent = await prisma.loginEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LoginEventUpdateManyArgs>(args: SelectSubset<T, LoginEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LoginEvents and returns the data updated in the database.
     * @param {LoginEventUpdateManyAndReturnArgs} args - Arguments to update many LoginEvents.
     * @example
     * // Update many LoginEvents
     * const loginEvent = await prisma.loginEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more LoginEvents and only return the `id`
     * const loginEventWithIdOnly = await prisma.loginEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends LoginEventUpdateManyAndReturnArgs>(args: SelectSubset<T, LoginEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one LoginEvent.
     * @param {LoginEventUpsertArgs} args - Arguments to update or create a LoginEvent.
     * @example
     * // Update or create a LoginEvent
     * const loginEvent = await prisma.loginEvent.upsert({
     *   create: {
     *     // ... data to create a LoginEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LoginEvent we want to update
     *   }
     * })
     */
    upsert<T extends LoginEventUpsertArgs>(args: SelectSubset<T, LoginEventUpsertArgs<ExtArgs>>): Prisma__LoginEventClient<$Result.GetResult<Prisma.$LoginEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of LoginEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventCountArgs} args - Arguments to filter LoginEvents to count.
     * @example
     * // Count the number of LoginEvents
     * const count = await prisma.loginEvent.count({
     *   where: {
     *     // ... the filter for the LoginEvents we want to count
     *   }
     * })
    **/
    count<T extends LoginEventCountArgs>(
      args?: Subset<T, LoginEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LoginEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LoginEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LoginEventAggregateArgs>(args: Subset<T, LoginEventAggregateArgs>): Prisma.PrismaPromise<GetLoginEventAggregateType<T>>

    /**
     * Group by LoginEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LoginEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LoginEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LoginEventGroupByArgs['orderBy'] }
        : { orderBy?: LoginEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LoginEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLoginEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LoginEvent model
   */
  readonly fields: LoginEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LoginEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LoginEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends LoginEvent$userArgs<ExtArgs> = {}>(args?: Subset<T, LoginEvent$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LoginEvent model
   */
  interface LoginEventFieldRefs {
    readonly id: FieldRef<"LoginEvent", 'String'>
    readonly userId: FieldRef<"LoginEvent", 'String'>
    readonly eventType: FieldRef<"LoginEvent", 'LoginEventType'>
    readonly success: FieldRef<"LoginEvent", 'Boolean'>
    readonly ipAddress: FieldRef<"LoginEvent", 'String'>
    readonly userAgent: FieldRef<"LoginEvent", 'String'>
    readonly reason: FieldRef<"LoginEvent", 'String'>
    readonly meta: FieldRef<"LoginEvent", 'Json'>
    readonly createdAt: FieldRef<"LoginEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LoginEvent findUnique
   */
  export type LoginEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter, which LoginEvent to fetch.
     */
    where: LoginEventWhereUniqueInput
  }

  /**
   * LoginEvent findUniqueOrThrow
   */
  export type LoginEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter, which LoginEvent to fetch.
     */
    where: LoginEventWhereUniqueInput
  }

  /**
   * LoginEvent findFirst
   */
  export type LoginEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter, which LoginEvent to fetch.
     */
    where?: LoginEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LoginEvents to fetch.
     */
    orderBy?: LoginEventOrderByWithRelationInput | LoginEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LoginEvents.
     */
    cursor?: LoginEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LoginEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LoginEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LoginEvents.
     */
    distinct?: LoginEventScalarFieldEnum | LoginEventScalarFieldEnum[]
  }

  /**
   * LoginEvent findFirstOrThrow
   */
  export type LoginEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter, which LoginEvent to fetch.
     */
    where?: LoginEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LoginEvents to fetch.
     */
    orderBy?: LoginEventOrderByWithRelationInput | LoginEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LoginEvents.
     */
    cursor?: LoginEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LoginEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LoginEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LoginEvents.
     */
    distinct?: LoginEventScalarFieldEnum | LoginEventScalarFieldEnum[]
  }

  /**
   * LoginEvent findMany
   */
  export type LoginEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter, which LoginEvents to fetch.
     */
    where?: LoginEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LoginEvents to fetch.
     */
    orderBy?: LoginEventOrderByWithRelationInput | LoginEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LoginEvents.
     */
    cursor?: LoginEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LoginEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LoginEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LoginEvents.
     */
    distinct?: LoginEventScalarFieldEnum | LoginEventScalarFieldEnum[]
  }

  /**
   * LoginEvent create
   */
  export type LoginEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * The data needed to create a LoginEvent.
     */
    data: XOR<LoginEventCreateInput, LoginEventUncheckedCreateInput>
  }

  /**
   * LoginEvent createMany
   */
  export type LoginEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LoginEvents.
     */
    data: LoginEventCreateManyInput | LoginEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * LoginEvent createManyAndReturn
   */
  export type LoginEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * The data used to create many LoginEvents.
     */
    data: LoginEventCreateManyInput | LoginEventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * LoginEvent update
   */
  export type LoginEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * The data needed to update a LoginEvent.
     */
    data: XOR<LoginEventUpdateInput, LoginEventUncheckedUpdateInput>
    /**
     * Choose, which LoginEvent to update.
     */
    where: LoginEventWhereUniqueInput
  }

  /**
   * LoginEvent updateMany
   */
  export type LoginEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LoginEvents.
     */
    data: XOR<LoginEventUpdateManyMutationInput, LoginEventUncheckedUpdateManyInput>
    /**
     * Filter which LoginEvents to update
     */
    where?: LoginEventWhereInput
    /**
     * Limit how many LoginEvents to update.
     */
    limit?: number
  }

  /**
   * LoginEvent updateManyAndReturn
   */
  export type LoginEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * The data used to update LoginEvents.
     */
    data: XOR<LoginEventUpdateManyMutationInput, LoginEventUncheckedUpdateManyInput>
    /**
     * Filter which LoginEvents to update
     */
    where?: LoginEventWhereInput
    /**
     * Limit how many LoginEvents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * LoginEvent upsert
   */
  export type LoginEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * The filter to search for the LoginEvent to update in case it exists.
     */
    where: LoginEventWhereUniqueInput
    /**
     * In case the LoginEvent found by the `where` argument doesn't exist, create a new LoginEvent with this data.
     */
    create: XOR<LoginEventCreateInput, LoginEventUncheckedCreateInput>
    /**
     * In case the LoginEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LoginEventUpdateInput, LoginEventUncheckedUpdateInput>
  }

  /**
   * LoginEvent delete
   */
  export type LoginEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
    /**
     * Filter which LoginEvent to delete.
     */
    where: LoginEventWhereUniqueInput
  }

  /**
   * LoginEvent deleteMany
   */
  export type LoginEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LoginEvents to delete
     */
    where?: LoginEventWhereInput
    /**
     * Limit how many LoginEvents to delete.
     */
    limit?: number
  }

  /**
   * LoginEvent.user
   */
  export type LoginEvent$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * LoginEvent without action
   */
  export type LoginEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LoginEvent
     */
    select?: LoginEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the LoginEvent
     */
    omit?: LoginEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LoginEventInclude<ExtArgs> | null
  }


  /**
   * Model PasswordResetToken
   */

  export type AggregatePasswordResetToken = {
    _count: PasswordResetTokenCountAggregateOutputType | null
    _min: PasswordResetTokenMinAggregateOutputType | null
    _max: PasswordResetTokenMaxAggregateOutputType | null
  }

  export type PasswordResetTokenMinAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    expiresAt: Date | null
    usedAt: Date | null
    createdBy: string | null
    createdAt: Date | null
  }

  export type PasswordResetTokenMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    tokenHash: string | null
    expiresAt: Date | null
    usedAt: Date | null
    createdBy: string | null
    createdAt: Date | null
  }

  export type PasswordResetTokenCountAggregateOutputType = {
    id: number
    userId: number
    tokenHash: number
    expiresAt: number
    usedAt: number
    createdBy: number
    createdAt: number
    _all: number
  }


  export type PasswordResetTokenMinAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    expiresAt?: true
    usedAt?: true
    createdBy?: true
    createdAt?: true
  }

  export type PasswordResetTokenMaxAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    expiresAt?: true
    usedAt?: true
    createdBy?: true
    createdAt?: true
  }

  export type PasswordResetTokenCountAggregateInputType = {
    id?: true
    userId?: true
    tokenHash?: true
    expiresAt?: true
    usedAt?: true
    createdBy?: true
    createdAt?: true
    _all?: true
  }

  export type PasswordResetTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PasswordResetToken to aggregate.
     */
    where?: PasswordResetTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PasswordResetTokens to fetch.
     */
    orderBy?: PasswordResetTokenOrderByWithRelationInput | PasswordResetTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PasswordResetTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PasswordResetTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PasswordResetTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PasswordResetTokens
    **/
    _count?: true | PasswordResetTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PasswordResetTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PasswordResetTokenMaxAggregateInputType
  }

  export type GetPasswordResetTokenAggregateType<T extends PasswordResetTokenAggregateArgs> = {
        [P in keyof T & keyof AggregatePasswordResetToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePasswordResetToken[P]>
      : GetScalarType<T[P], AggregatePasswordResetToken[P]>
  }




  export type PasswordResetTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PasswordResetTokenWhereInput
    orderBy?: PasswordResetTokenOrderByWithAggregationInput | PasswordResetTokenOrderByWithAggregationInput[]
    by: PasswordResetTokenScalarFieldEnum[] | PasswordResetTokenScalarFieldEnum
    having?: PasswordResetTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PasswordResetTokenCountAggregateInputType | true
    _min?: PasswordResetTokenMinAggregateInputType
    _max?: PasswordResetTokenMaxAggregateInputType
  }

  export type PasswordResetTokenGroupByOutputType = {
    id: string
    userId: string
    tokenHash: string
    expiresAt: Date
    usedAt: Date | null
    createdBy: string | null
    createdAt: Date
    _count: PasswordResetTokenCountAggregateOutputType | null
    _min: PasswordResetTokenMinAggregateOutputType | null
    _max: PasswordResetTokenMaxAggregateOutputType | null
  }

  type GetPasswordResetTokenGroupByPayload<T extends PasswordResetTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PasswordResetTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PasswordResetTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PasswordResetTokenGroupByOutputType[P]>
            : GetScalarType<T[P], PasswordResetTokenGroupByOutputType[P]>
        }
      >
    >


  export type PasswordResetTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    expiresAt?: boolean
    usedAt?: boolean
    createdBy?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["passwordResetToken"]>

  export type PasswordResetTokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    expiresAt?: boolean
    usedAt?: boolean
    createdBy?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["passwordResetToken"]>

  export type PasswordResetTokenSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    expiresAt?: boolean
    usedAt?: boolean
    createdBy?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["passwordResetToken"]>

  export type PasswordResetTokenSelectScalar = {
    id?: boolean
    userId?: boolean
    tokenHash?: boolean
    expiresAt?: boolean
    usedAt?: boolean
    createdBy?: boolean
    createdAt?: boolean
  }

  export type PasswordResetTokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "tokenHash" | "expiresAt" | "usedAt" | "createdBy" | "createdAt", ExtArgs["result"]["passwordResetToken"]>
  export type PasswordResetTokenInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PasswordResetTokenIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PasswordResetTokenIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $PasswordResetTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PasswordResetToken"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      tokenHash: string
      expiresAt: Date
      usedAt: Date | null
      createdBy: string | null
      createdAt: Date
    }, ExtArgs["result"]["passwordResetToken"]>
    composites: {}
  }

  type PasswordResetTokenGetPayload<S extends boolean | null | undefined | PasswordResetTokenDefaultArgs> = $Result.GetResult<Prisma.$PasswordResetTokenPayload, S>

  type PasswordResetTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PasswordResetTokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PasswordResetTokenCountAggregateInputType | true
    }

  export interface PasswordResetTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PasswordResetToken'], meta: { name: 'PasswordResetToken' } }
    /**
     * Find zero or one PasswordResetToken that matches the filter.
     * @param {PasswordResetTokenFindUniqueArgs} args - Arguments to find a PasswordResetToken
     * @example
     * // Get one PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PasswordResetTokenFindUniqueArgs>(args: SelectSubset<T, PasswordResetTokenFindUniqueArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PasswordResetToken that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PasswordResetTokenFindUniqueOrThrowArgs} args - Arguments to find a PasswordResetToken
     * @example
     * // Get one PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PasswordResetTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, PasswordResetTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PasswordResetToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenFindFirstArgs} args - Arguments to find a PasswordResetToken
     * @example
     * // Get one PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PasswordResetTokenFindFirstArgs>(args?: SelectSubset<T, PasswordResetTokenFindFirstArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PasswordResetToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenFindFirstOrThrowArgs} args - Arguments to find a PasswordResetToken
     * @example
     * // Get one PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PasswordResetTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, PasswordResetTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PasswordResetTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PasswordResetTokens
     * const passwordResetTokens = await prisma.passwordResetToken.findMany()
     * 
     * // Get first 10 PasswordResetTokens
     * const passwordResetTokens = await prisma.passwordResetToken.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const passwordResetTokenWithIdOnly = await prisma.passwordResetToken.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PasswordResetTokenFindManyArgs>(args?: SelectSubset<T, PasswordResetTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PasswordResetToken.
     * @param {PasswordResetTokenCreateArgs} args - Arguments to create a PasswordResetToken.
     * @example
     * // Create one PasswordResetToken
     * const PasswordResetToken = await prisma.passwordResetToken.create({
     *   data: {
     *     // ... data to create a PasswordResetToken
     *   }
     * })
     * 
     */
    create<T extends PasswordResetTokenCreateArgs>(args: SelectSubset<T, PasswordResetTokenCreateArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PasswordResetTokens.
     * @param {PasswordResetTokenCreateManyArgs} args - Arguments to create many PasswordResetTokens.
     * @example
     * // Create many PasswordResetTokens
     * const passwordResetToken = await prisma.passwordResetToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PasswordResetTokenCreateManyArgs>(args?: SelectSubset<T, PasswordResetTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PasswordResetTokens and returns the data saved in the database.
     * @param {PasswordResetTokenCreateManyAndReturnArgs} args - Arguments to create many PasswordResetTokens.
     * @example
     * // Create many PasswordResetTokens
     * const passwordResetToken = await prisma.passwordResetToken.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PasswordResetTokens and only return the `id`
     * const passwordResetTokenWithIdOnly = await prisma.passwordResetToken.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PasswordResetTokenCreateManyAndReturnArgs>(args?: SelectSubset<T, PasswordResetTokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PasswordResetToken.
     * @param {PasswordResetTokenDeleteArgs} args - Arguments to delete one PasswordResetToken.
     * @example
     * // Delete one PasswordResetToken
     * const PasswordResetToken = await prisma.passwordResetToken.delete({
     *   where: {
     *     // ... filter to delete one PasswordResetToken
     *   }
     * })
     * 
     */
    delete<T extends PasswordResetTokenDeleteArgs>(args: SelectSubset<T, PasswordResetTokenDeleteArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PasswordResetToken.
     * @param {PasswordResetTokenUpdateArgs} args - Arguments to update one PasswordResetToken.
     * @example
     * // Update one PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PasswordResetTokenUpdateArgs>(args: SelectSubset<T, PasswordResetTokenUpdateArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PasswordResetTokens.
     * @param {PasswordResetTokenDeleteManyArgs} args - Arguments to filter PasswordResetTokens to delete.
     * @example
     * // Delete a few PasswordResetTokens
     * const { count } = await prisma.passwordResetToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PasswordResetTokenDeleteManyArgs>(args?: SelectSubset<T, PasswordResetTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PasswordResetTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PasswordResetTokens
     * const passwordResetToken = await prisma.passwordResetToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PasswordResetTokenUpdateManyArgs>(args: SelectSubset<T, PasswordResetTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PasswordResetTokens and returns the data updated in the database.
     * @param {PasswordResetTokenUpdateManyAndReturnArgs} args - Arguments to update many PasswordResetTokens.
     * @example
     * // Update many PasswordResetTokens
     * const passwordResetToken = await prisma.passwordResetToken.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PasswordResetTokens and only return the `id`
     * const passwordResetTokenWithIdOnly = await prisma.passwordResetToken.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PasswordResetTokenUpdateManyAndReturnArgs>(args: SelectSubset<T, PasswordResetTokenUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PasswordResetToken.
     * @param {PasswordResetTokenUpsertArgs} args - Arguments to update or create a PasswordResetToken.
     * @example
     * // Update or create a PasswordResetToken
     * const passwordResetToken = await prisma.passwordResetToken.upsert({
     *   create: {
     *     // ... data to create a PasswordResetToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PasswordResetToken we want to update
     *   }
     * })
     */
    upsert<T extends PasswordResetTokenUpsertArgs>(args: SelectSubset<T, PasswordResetTokenUpsertArgs<ExtArgs>>): Prisma__PasswordResetTokenClient<$Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PasswordResetTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenCountArgs} args - Arguments to filter PasswordResetTokens to count.
     * @example
     * // Count the number of PasswordResetTokens
     * const count = await prisma.passwordResetToken.count({
     *   where: {
     *     // ... the filter for the PasswordResetTokens we want to count
     *   }
     * })
    **/
    count<T extends PasswordResetTokenCountArgs>(
      args?: Subset<T, PasswordResetTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PasswordResetTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PasswordResetToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PasswordResetTokenAggregateArgs>(args: Subset<T, PasswordResetTokenAggregateArgs>): Prisma.PrismaPromise<GetPasswordResetTokenAggregateType<T>>

    /**
     * Group by PasswordResetToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PasswordResetTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PasswordResetTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PasswordResetTokenGroupByArgs['orderBy'] }
        : { orderBy?: PasswordResetTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PasswordResetTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPasswordResetTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PasswordResetToken model
   */
  readonly fields: PasswordResetTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PasswordResetToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PasswordResetTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PasswordResetToken model
   */
  interface PasswordResetTokenFieldRefs {
    readonly id: FieldRef<"PasswordResetToken", 'String'>
    readonly userId: FieldRef<"PasswordResetToken", 'String'>
    readonly tokenHash: FieldRef<"PasswordResetToken", 'String'>
    readonly expiresAt: FieldRef<"PasswordResetToken", 'DateTime'>
    readonly usedAt: FieldRef<"PasswordResetToken", 'DateTime'>
    readonly createdBy: FieldRef<"PasswordResetToken", 'String'>
    readonly createdAt: FieldRef<"PasswordResetToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PasswordResetToken findUnique
   */
  export type PasswordResetTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter, which PasswordResetToken to fetch.
     */
    where: PasswordResetTokenWhereUniqueInput
  }

  /**
   * PasswordResetToken findUniqueOrThrow
   */
  export type PasswordResetTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter, which PasswordResetToken to fetch.
     */
    where: PasswordResetTokenWhereUniqueInput
  }

  /**
   * PasswordResetToken findFirst
   */
  export type PasswordResetTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter, which PasswordResetToken to fetch.
     */
    where?: PasswordResetTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PasswordResetTokens to fetch.
     */
    orderBy?: PasswordResetTokenOrderByWithRelationInput | PasswordResetTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PasswordResetTokens.
     */
    cursor?: PasswordResetTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PasswordResetTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PasswordResetTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PasswordResetTokens.
     */
    distinct?: PasswordResetTokenScalarFieldEnum | PasswordResetTokenScalarFieldEnum[]
  }

  /**
   * PasswordResetToken findFirstOrThrow
   */
  export type PasswordResetTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter, which PasswordResetToken to fetch.
     */
    where?: PasswordResetTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PasswordResetTokens to fetch.
     */
    orderBy?: PasswordResetTokenOrderByWithRelationInput | PasswordResetTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PasswordResetTokens.
     */
    cursor?: PasswordResetTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PasswordResetTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PasswordResetTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PasswordResetTokens.
     */
    distinct?: PasswordResetTokenScalarFieldEnum | PasswordResetTokenScalarFieldEnum[]
  }

  /**
   * PasswordResetToken findMany
   */
  export type PasswordResetTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter, which PasswordResetTokens to fetch.
     */
    where?: PasswordResetTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PasswordResetTokens to fetch.
     */
    orderBy?: PasswordResetTokenOrderByWithRelationInput | PasswordResetTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PasswordResetTokens.
     */
    cursor?: PasswordResetTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PasswordResetTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PasswordResetTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PasswordResetTokens.
     */
    distinct?: PasswordResetTokenScalarFieldEnum | PasswordResetTokenScalarFieldEnum[]
  }

  /**
   * PasswordResetToken create
   */
  export type PasswordResetTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * The data needed to create a PasswordResetToken.
     */
    data: XOR<PasswordResetTokenCreateInput, PasswordResetTokenUncheckedCreateInput>
  }

  /**
   * PasswordResetToken createMany
   */
  export type PasswordResetTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PasswordResetTokens.
     */
    data: PasswordResetTokenCreateManyInput | PasswordResetTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PasswordResetToken createManyAndReturn
   */
  export type PasswordResetTokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * The data used to create many PasswordResetTokens.
     */
    data: PasswordResetTokenCreateManyInput | PasswordResetTokenCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PasswordResetToken update
   */
  export type PasswordResetTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * The data needed to update a PasswordResetToken.
     */
    data: XOR<PasswordResetTokenUpdateInput, PasswordResetTokenUncheckedUpdateInput>
    /**
     * Choose, which PasswordResetToken to update.
     */
    where: PasswordResetTokenWhereUniqueInput
  }

  /**
   * PasswordResetToken updateMany
   */
  export type PasswordResetTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PasswordResetTokens.
     */
    data: XOR<PasswordResetTokenUpdateManyMutationInput, PasswordResetTokenUncheckedUpdateManyInput>
    /**
     * Filter which PasswordResetTokens to update
     */
    where?: PasswordResetTokenWhereInput
    /**
     * Limit how many PasswordResetTokens to update.
     */
    limit?: number
  }

  /**
   * PasswordResetToken updateManyAndReturn
   */
  export type PasswordResetTokenUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * The data used to update PasswordResetTokens.
     */
    data: XOR<PasswordResetTokenUpdateManyMutationInput, PasswordResetTokenUncheckedUpdateManyInput>
    /**
     * Filter which PasswordResetTokens to update
     */
    where?: PasswordResetTokenWhereInput
    /**
     * Limit how many PasswordResetTokens to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PasswordResetToken upsert
   */
  export type PasswordResetTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * The filter to search for the PasswordResetToken to update in case it exists.
     */
    where: PasswordResetTokenWhereUniqueInput
    /**
     * In case the PasswordResetToken found by the `where` argument doesn't exist, create a new PasswordResetToken with this data.
     */
    create: XOR<PasswordResetTokenCreateInput, PasswordResetTokenUncheckedCreateInput>
    /**
     * In case the PasswordResetToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PasswordResetTokenUpdateInput, PasswordResetTokenUncheckedUpdateInput>
  }

  /**
   * PasswordResetToken delete
   */
  export type PasswordResetTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
    /**
     * Filter which PasswordResetToken to delete.
     */
    where: PasswordResetTokenWhereUniqueInput
  }

  /**
   * PasswordResetToken deleteMany
   */
  export type PasswordResetTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PasswordResetTokens to delete
     */
    where?: PasswordResetTokenWhereInput
    /**
     * Limit how many PasswordResetTokens to delete.
     */
    limit?: number
  }

  /**
   * PasswordResetToken without action
   */
  export type PasswordResetTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PasswordResetToken
     */
    select?: PasswordResetTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PasswordResetToken
     */
    omit?: PasswordResetTokenOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PasswordResetTokenInclude<ExtArgs> | null
  }


  /**
   * Model Course
   */

  export type AggregateCourse = {
    _count: CourseCountAggregateOutputType | null
    _avg: CourseAvgAggregateOutputType | null
    _sum: CourseSumAggregateOutputType | null
    _min: CourseMinAggregateOutputType | null
    _max: CourseMaxAggregateOutputType | null
  }

  export type CourseAvgAggregateOutputType = {
    duration: number | null
    hours: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installmentCount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
  }

  export type CourseSumAggregateOutputType = {
    duration: number | null
    hours: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installmentCount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
  }

  export type CourseMinAggregateOutputType = {
    id: string | null
    name: string | null
    nameKey: string | null
    description: string | null
    feeReference: string | null
    mode: string | null
    duration: number | null
    hours: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installmentCount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    status: $Enums.RecordStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseMaxAggregateOutputType = {
    id: string | null
    name: string | null
    nameKey: string | null
    description: string | null
    feeReference: string | null
    mode: string | null
    duration: number | null
    hours: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installmentCount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    status: $Enums.RecordStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseCountAggregateOutputType = {
    id: number
    name: number
    nameKey: number
    description: number
    feeReference: number
    mode: number
    duration: number
    hours: number
    actualFees: number
    registrationFees: number
    discount: number
    afterDiscount: number
    installmentCount: number
    installment1: number
    installment2: number
    installment3: number
    status: number
    statusChangedAt: number
    statusChangedBy: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CourseAvgAggregateInputType = {
    duration?: true
    hours?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installmentCount?: true
    installment1?: true
    installment2?: true
    installment3?: true
  }

  export type CourseSumAggregateInputType = {
    duration?: true
    hours?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installmentCount?: true
    installment1?: true
    installment2?: true
    installment3?: true
  }

  export type CourseMinAggregateInputType = {
    id?: true
    name?: true
    nameKey?: true
    description?: true
    feeReference?: true
    mode?: true
    duration?: true
    hours?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installmentCount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseMaxAggregateInputType = {
    id?: true
    name?: true
    nameKey?: true
    description?: true
    feeReference?: true
    mode?: true
    duration?: true
    hours?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installmentCount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseCountAggregateInputType = {
    id?: true
    name?: true
    nameKey?: true
    description?: true
    feeReference?: true
    mode?: true
    duration?: true
    hours?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installmentCount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CourseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Course to aggregate.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Courses
    **/
    _count?: true | CourseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CourseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CourseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourseMaxAggregateInputType
  }

  export type GetCourseAggregateType<T extends CourseAggregateArgs> = {
        [P in keyof T & keyof AggregateCourse]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourse[P]>
      : GetScalarType<T[P], AggregateCourse[P]>
  }




  export type CourseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourseWhereInput
    orderBy?: CourseOrderByWithAggregationInput | CourseOrderByWithAggregationInput[]
    by: CourseScalarFieldEnum[] | CourseScalarFieldEnum
    having?: CourseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourseCountAggregateInputType | true
    _avg?: CourseAvgAggregateInputType
    _sum?: CourseSumAggregateInputType
    _min?: CourseMinAggregateInputType
    _max?: CourseMaxAggregateInputType
  }

  export type CourseGroupByOutputType = {
    id: string
    name: string
    nameKey: string
    description: string | null
    feeReference: string | null
    mode: string
    duration: number | null
    hours: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installmentCount: number
    installment1: number | null
    installment2: number | null
    installment3: number | null
    status: $Enums.RecordStatus
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: CourseCountAggregateOutputType | null
    _avg: CourseAvgAggregateOutputType | null
    _sum: CourseSumAggregateOutputType | null
    _min: CourseMinAggregateOutputType | null
    _max: CourseMaxAggregateOutputType | null
  }

  type GetCourseGroupByPayload<T extends CourseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourseGroupByOutputType[P]>
            : GetScalarType<T[P], CourseGroupByOutputType[P]>
        }
      >
    >


  export type CourseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameKey?: boolean
    description?: boolean
    feeReference?: boolean
    mode?: boolean
    duration?: boolean
    hours?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installmentCount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    modules?: boolean | Course$modulesArgs<ExtArgs>
    batches?: boolean | Course$batchesArgs<ExtArgs>
    students?: boolean | Course$studentsArgs<ExtArgs>
    statusHistory?: boolean | Course$statusHistoryArgs<ExtArgs>
    _count?: boolean | CourseCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["course"]>

  export type CourseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameKey?: boolean
    description?: boolean
    feeReference?: boolean
    mode?: boolean
    duration?: boolean
    hours?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installmentCount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["course"]>

  export type CourseSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nameKey?: boolean
    description?: boolean
    feeReference?: boolean
    mode?: boolean
    duration?: boolean
    hours?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installmentCount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["course"]>

  export type CourseSelectScalar = {
    id?: boolean
    name?: boolean
    nameKey?: boolean
    description?: boolean
    feeReference?: boolean
    mode?: boolean
    duration?: boolean
    hours?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installmentCount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CourseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "nameKey" | "description" | "feeReference" | "mode" | "duration" | "hours" | "actualFees" | "registrationFees" | "discount" | "afterDiscount" | "installmentCount" | "installment1" | "installment2" | "installment3" | "status" | "statusChangedAt" | "statusChangedBy" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["course"]>
  export type CourseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    modules?: boolean | Course$modulesArgs<ExtArgs>
    batches?: boolean | Course$batchesArgs<ExtArgs>
    students?: boolean | Course$studentsArgs<ExtArgs>
    statusHistory?: boolean | Course$statusHistoryArgs<ExtArgs>
    _count?: boolean | CourseCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CourseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type CourseIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $CoursePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Course"
    objects: {
      modules: Prisma.$CourseModulePayload<ExtArgs>[]
      batches: Prisma.$BatchPayload<ExtArgs>[]
      students: Prisma.$StudentProfilePayload<ExtArgs>[]
      statusHistory: Prisma.$CourseStatusHistoryPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      nameKey: string
      description: string | null
      feeReference: string | null
      mode: string
      duration: number | null
      hours: number | null
      actualFees: number | null
      registrationFees: number | null
      discount: number | null
      afterDiscount: number | null
      installmentCount: number
      installment1: number | null
      installment2: number | null
      installment3: number | null
      status: $Enums.RecordStatus
      statusChangedAt: Date | null
      statusChangedBy: string | null
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["course"]>
    composites: {}
  }

  type CourseGetPayload<S extends boolean | null | undefined | CourseDefaultArgs> = $Result.GetResult<Prisma.$CoursePayload, S>

  type CourseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CourseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourseCountAggregateInputType | true
    }

  export interface CourseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Course'], meta: { name: 'Course' } }
    /**
     * Find zero or one Course that matches the filter.
     * @param {CourseFindUniqueArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourseFindUniqueArgs>(args: SelectSubset<T, CourseFindUniqueArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Course that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourseFindUniqueOrThrowArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourseFindUniqueOrThrowArgs>(args: SelectSubset<T, CourseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Course that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindFirstArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourseFindFirstArgs>(args?: SelectSubset<T, CourseFindFirstArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Course that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindFirstOrThrowArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourseFindFirstOrThrowArgs>(args?: SelectSubset<T, CourseFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Courses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Courses
     * const courses = await prisma.course.findMany()
     * 
     * // Get first 10 Courses
     * const courses = await prisma.course.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courseWithIdOnly = await prisma.course.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourseFindManyArgs>(args?: SelectSubset<T, CourseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Course.
     * @param {CourseCreateArgs} args - Arguments to create a Course.
     * @example
     * // Create one Course
     * const Course = await prisma.course.create({
     *   data: {
     *     // ... data to create a Course
     *   }
     * })
     * 
     */
    create<T extends CourseCreateArgs>(args: SelectSubset<T, CourseCreateArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Courses.
     * @param {CourseCreateManyArgs} args - Arguments to create many Courses.
     * @example
     * // Create many Courses
     * const course = await prisma.course.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourseCreateManyArgs>(args?: SelectSubset<T, CourseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Courses and returns the data saved in the database.
     * @param {CourseCreateManyAndReturnArgs} args - Arguments to create many Courses.
     * @example
     * // Create many Courses
     * const course = await prisma.course.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Courses and only return the `id`
     * const courseWithIdOnly = await prisma.course.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourseCreateManyAndReturnArgs>(args?: SelectSubset<T, CourseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Course.
     * @param {CourseDeleteArgs} args - Arguments to delete one Course.
     * @example
     * // Delete one Course
     * const Course = await prisma.course.delete({
     *   where: {
     *     // ... filter to delete one Course
     *   }
     * })
     * 
     */
    delete<T extends CourseDeleteArgs>(args: SelectSubset<T, CourseDeleteArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Course.
     * @param {CourseUpdateArgs} args - Arguments to update one Course.
     * @example
     * // Update one Course
     * const course = await prisma.course.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourseUpdateArgs>(args: SelectSubset<T, CourseUpdateArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Courses.
     * @param {CourseDeleteManyArgs} args - Arguments to filter Courses to delete.
     * @example
     * // Delete a few Courses
     * const { count } = await prisma.course.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourseDeleteManyArgs>(args?: SelectSubset<T, CourseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Courses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Courses
     * const course = await prisma.course.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourseUpdateManyArgs>(args: SelectSubset<T, CourseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Courses and returns the data updated in the database.
     * @param {CourseUpdateManyAndReturnArgs} args - Arguments to update many Courses.
     * @example
     * // Update many Courses
     * const course = await prisma.course.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Courses and only return the `id`
     * const courseWithIdOnly = await prisma.course.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourseUpdateManyAndReturnArgs>(args: SelectSubset<T, CourseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Course.
     * @param {CourseUpsertArgs} args - Arguments to update or create a Course.
     * @example
     * // Update or create a Course
     * const course = await prisma.course.upsert({
     *   create: {
     *     // ... data to create a Course
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Course we want to update
     *   }
     * })
     */
    upsert<T extends CourseUpsertArgs>(args: SelectSubset<T, CourseUpsertArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Courses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseCountArgs} args - Arguments to filter Courses to count.
     * @example
     * // Count the number of Courses
     * const count = await prisma.course.count({
     *   where: {
     *     // ... the filter for the Courses we want to count
     *   }
     * })
    **/
    count<T extends CourseCountArgs>(
      args?: Subset<T, CourseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Course.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourseAggregateArgs>(args: Subset<T, CourseAggregateArgs>): Prisma.PrismaPromise<GetCourseAggregateType<T>>

    /**
     * Group by Course.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourseGroupByArgs['orderBy'] }
        : { orderBy?: CourseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Course model
   */
  readonly fields: CourseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Course.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    modules<T extends Course$modulesArgs<ExtArgs> = {}>(args?: Subset<T, Course$modulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    batches<T extends Course$batchesArgs<ExtArgs> = {}>(args?: Subset<T, Course$batchesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    students<T extends Course$studentsArgs<ExtArgs> = {}>(args?: Subset<T, Course$studentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    statusHistory<T extends Course$statusHistoryArgs<ExtArgs> = {}>(args?: Subset<T, Course$statusHistoryArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Course model
   */
  interface CourseFieldRefs {
    readonly id: FieldRef<"Course", 'String'>
    readonly name: FieldRef<"Course", 'String'>
    readonly nameKey: FieldRef<"Course", 'String'>
    readonly description: FieldRef<"Course", 'String'>
    readonly feeReference: FieldRef<"Course", 'String'>
    readonly mode: FieldRef<"Course", 'String'>
    readonly duration: FieldRef<"Course", 'Int'>
    readonly hours: FieldRef<"Course", 'Int'>
    readonly actualFees: FieldRef<"Course", 'Int'>
    readonly registrationFees: FieldRef<"Course", 'Int'>
    readonly discount: FieldRef<"Course", 'Int'>
    readonly afterDiscount: FieldRef<"Course", 'Int'>
    readonly installmentCount: FieldRef<"Course", 'Int'>
    readonly installment1: FieldRef<"Course", 'Int'>
    readonly installment2: FieldRef<"Course", 'Int'>
    readonly installment3: FieldRef<"Course", 'Int'>
    readonly status: FieldRef<"Course", 'RecordStatus'>
    readonly statusChangedAt: FieldRef<"Course", 'DateTime'>
    readonly statusChangedBy: FieldRef<"Course", 'String'>
    readonly createdBy: FieldRef<"Course", 'String'>
    readonly updatedBy: FieldRef<"Course", 'String'>
    readonly createdAt: FieldRef<"Course", 'DateTime'>
    readonly updatedAt: FieldRef<"Course", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Course findUnique
   */
  export type CourseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course findUniqueOrThrow
   */
  export type CourseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course findFirst
   */
  export type CourseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Courses.
     */
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course findFirstOrThrow
   */
  export type CourseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Courses.
     */
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course findMany
   */
  export type CourseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Courses to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Courses.
     */
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course create
   */
  export type CourseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The data needed to create a Course.
     */
    data: XOR<CourseCreateInput, CourseUncheckedCreateInput>
  }

  /**
   * Course createMany
   */
  export type CourseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Courses.
     */
    data: CourseCreateManyInput | CourseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Course createManyAndReturn
   */
  export type CourseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * The data used to create many Courses.
     */
    data: CourseCreateManyInput | CourseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Course update
   */
  export type CourseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The data needed to update a Course.
     */
    data: XOR<CourseUpdateInput, CourseUncheckedUpdateInput>
    /**
     * Choose, which Course to update.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course updateMany
   */
  export type CourseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Courses.
     */
    data: XOR<CourseUpdateManyMutationInput, CourseUncheckedUpdateManyInput>
    /**
     * Filter which Courses to update
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to update.
     */
    limit?: number
  }

  /**
   * Course updateManyAndReturn
   */
  export type CourseUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * The data used to update Courses.
     */
    data: XOR<CourseUpdateManyMutationInput, CourseUncheckedUpdateManyInput>
    /**
     * Filter which Courses to update
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to update.
     */
    limit?: number
  }

  /**
   * Course upsert
   */
  export type CourseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The filter to search for the Course to update in case it exists.
     */
    where: CourseWhereUniqueInput
    /**
     * In case the Course found by the `where` argument doesn't exist, create a new Course with this data.
     */
    create: XOR<CourseCreateInput, CourseUncheckedCreateInput>
    /**
     * In case the Course was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourseUpdateInput, CourseUncheckedUpdateInput>
  }

  /**
   * Course delete
   */
  export type CourseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter which Course to delete.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course deleteMany
   */
  export type CourseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Courses to delete
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to delete.
     */
    limit?: number
  }

  /**
   * Course.modules
   */
  export type Course$modulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    where?: CourseModuleWhereInput
    orderBy?: CourseModuleOrderByWithRelationInput | CourseModuleOrderByWithRelationInput[]
    cursor?: CourseModuleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CourseModuleScalarFieldEnum | CourseModuleScalarFieldEnum[]
  }

  /**
   * Course.batches
   */
  export type Course$batchesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    where?: BatchWhereInput
    orderBy?: BatchOrderByWithRelationInput | BatchOrderByWithRelationInput[]
    cursor?: BatchWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BatchScalarFieldEnum | BatchScalarFieldEnum[]
  }

  /**
   * Course.students
   */
  export type Course$studentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    where?: StudentProfileWhereInput
    orderBy?: StudentProfileOrderByWithRelationInput | StudentProfileOrderByWithRelationInput[]
    cursor?: StudentProfileWhereUniqueInput
    take?: number
    skip?: number
    distinct?: StudentProfileScalarFieldEnum | StudentProfileScalarFieldEnum[]
  }

  /**
   * Course.statusHistory
   */
  export type Course$statusHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    where?: CourseStatusHistoryWhereInput
    orderBy?: CourseStatusHistoryOrderByWithRelationInput | CourseStatusHistoryOrderByWithRelationInput[]
    cursor?: CourseStatusHistoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CourseStatusHistoryScalarFieldEnum | CourseStatusHistoryScalarFieldEnum[]
  }

  /**
   * Course without action
   */
  export type CourseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
  }


  /**
   * Model CourseModule
   */

  export type AggregateCourseModule = {
    _count: CourseModuleCountAggregateOutputType | null
    _avg: CourseModuleAvgAggregateOutputType | null
    _sum: CourseModuleSumAggregateOutputType | null
    _min: CourseModuleMinAggregateOutputType | null
    _max: CourseModuleMaxAggregateOutputType | null
  }

  export type CourseModuleAvgAggregateOutputType = {
    sequenceNo: number | null
  }

  export type CourseModuleSumAggregateOutputType = {
    sequenceNo: number | null
  }

  export type CourseModuleMinAggregateOutputType = {
    id: string | null
    courseId: string | null
    title: string | null
    titleKey: string | null
    description: string | null
    sequenceNo: number | null
    status: $Enums.RecordStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseModuleMaxAggregateOutputType = {
    id: string | null
    courseId: string | null
    title: string | null
    titleKey: string | null
    description: string | null
    sequenceNo: number | null
    status: $Enums.RecordStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseModuleCountAggregateOutputType = {
    id: number
    courseId: number
    title: number
    titleKey: number
    description: number
    sequenceNo: number
    status: number
    statusChangedAt: number
    statusChangedBy: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CourseModuleAvgAggregateInputType = {
    sequenceNo?: true
  }

  export type CourseModuleSumAggregateInputType = {
    sequenceNo?: true
  }

  export type CourseModuleMinAggregateInputType = {
    id?: true
    courseId?: true
    title?: true
    titleKey?: true
    description?: true
    sequenceNo?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseModuleMaxAggregateInputType = {
    id?: true
    courseId?: true
    title?: true
    titleKey?: true
    description?: true
    sequenceNo?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseModuleCountAggregateInputType = {
    id?: true
    courseId?: true
    title?: true
    titleKey?: true
    description?: true
    sequenceNo?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CourseModuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourseModule to aggregate.
     */
    where?: CourseModuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseModules to fetch.
     */
    orderBy?: CourseModuleOrderByWithRelationInput | CourseModuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourseModuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseModules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseModules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CourseModules
    **/
    _count?: true | CourseModuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CourseModuleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CourseModuleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourseModuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourseModuleMaxAggregateInputType
  }

  export type GetCourseModuleAggregateType<T extends CourseModuleAggregateArgs> = {
        [P in keyof T & keyof AggregateCourseModule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourseModule[P]>
      : GetScalarType<T[P], AggregateCourseModule[P]>
  }




  export type CourseModuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourseModuleWhereInput
    orderBy?: CourseModuleOrderByWithAggregationInput | CourseModuleOrderByWithAggregationInput[]
    by: CourseModuleScalarFieldEnum[] | CourseModuleScalarFieldEnum
    having?: CourseModuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourseModuleCountAggregateInputType | true
    _avg?: CourseModuleAvgAggregateInputType
    _sum?: CourseModuleSumAggregateInputType
    _min?: CourseModuleMinAggregateInputType
    _max?: CourseModuleMaxAggregateInputType
  }

  export type CourseModuleGroupByOutputType = {
    id: string
    courseId: string
    title: string
    titleKey: string
    description: string | null
    sequenceNo: number
    status: $Enums.RecordStatus
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: CourseModuleCountAggregateOutputType | null
    _avg: CourseModuleAvgAggregateOutputType | null
    _sum: CourseModuleSumAggregateOutputType | null
    _min: CourseModuleMinAggregateOutputType | null
    _max: CourseModuleMaxAggregateOutputType | null
  }

  type GetCourseModuleGroupByPayload<T extends CourseModuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourseModuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourseModuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourseModuleGroupByOutputType[P]>
            : GetScalarType<T[P], CourseModuleGroupByOutputType[P]>
        }
      >
    >


  export type CourseModuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    title?: boolean
    titleKey?: boolean
    description?: boolean
    sequenceNo?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseModule"]>

  export type CourseModuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    title?: boolean
    titleKey?: boolean
    description?: boolean
    sequenceNo?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseModule"]>

  export type CourseModuleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    title?: boolean
    titleKey?: boolean
    description?: boolean
    sequenceNo?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseModule"]>

  export type CourseModuleSelectScalar = {
    id?: boolean
    courseId?: boolean
    title?: boolean
    titleKey?: boolean
    description?: boolean
    sequenceNo?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CourseModuleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "courseId" | "title" | "titleKey" | "description" | "sequenceNo" | "status" | "statusChangedAt" | "statusChangedBy" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["courseModule"]>
  export type CourseModuleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type CourseModuleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type CourseModuleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }

  export type $CourseModulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CourseModule"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      courseId: string
      title: string
      titleKey: string
      description: string | null
      sequenceNo: number
      status: $Enums.RecordStatus
      statusChangedAt: Date | null
      statusChangedBy: string | null
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["courseModule"]>
    composites: {}
  }

  type CourseModuleGetPayload<S extends boolean | null | undefined | CourseModuleDefaultArgs> = $Result.GetResult<Prisma.$CourseModulePayload, S>

  type CourseModuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CourseModuleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourseModuleCountAggregateInputType | true
    }

  export interface CourseModuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CourseModule'], meta: { name: 'CourseModule' } }
    /**
     * Find zero or one CourseModule that matches the filter.
     * @param {CourseModuleFindUniqueArgs} args - Arguments to find a CourseModule
     * @example
     * // Get one CourseModule
     * const courseModule = await prisma.courseModule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourseModuleFindUniqueArgs>(args: SelectSubset<T, CourseModuleFindUniqueArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CourseModule that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourseModuleFindUniqueOrThrowArgs} args - Arguments to find a CourseModule
     * @example
     * // Get one CourseModule
     * const courseModule = await prisma.courseModule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourseModuleFindUniqueOrThrowArgs>(args: SelectSubset<T, CourseModuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourseModule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleFindFirstArgs} args - Arguments to find a CourseModule
     * @example
     * // Get one CourseModule
     * const courseModule = await prisma.courseModule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourseModuleFindFirstArgs>(args?: SelectSubset<T, CourseModuleFindFirstArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourseModule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleFindFirstOrThrowArgs} args - Arguments to find a CourseModule
     * @example
     * // Get one CourseModule
     * const courseModule = await prisma.courseModule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourseModuleFindFirstOrThrowArgs>(args?: SelectSubset<T, CourseModuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CourseModules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CourseModules
     * const courseModules = await prisma.courseModule.findMany()
     * 
     * // Get first 10 CourseModules
     * const courseModules = await prisma.courseModule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courseModuleWithIdOnly = await prisma.courseModule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourseModuleFindManyArgs>(args?: SelectSubset<T, CourseModuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CourseModule.
     * @param {CourseModuleCreateArgs} args - Arguments to create a CourseModule.
     * @example
     * // Create one CourseModule
     * const CourseModule = await prisma.courseModule.create({
     *   data: {
     *     // ... data to create a CourseModule
     *   }
     * })
     * 
     */
    create<T extends CourseModuleCreateArgs>(args: SelectSubset<T, CourseModuleCreateArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CourseModules.
     * @param {CourseModuleCreateManyArgs} args - Arguments to create many CourseModules.
     * @example
     * // Create many CourseModules
     * const courseModule = await prisma.courseModule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourseModuleCreateManyArgs>(args?: SelectSubset<T, CourseModuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CourseModules and returns the data saved in the database.
     * @param {CourseModuleCreateManyAndReturnArgs} args - Arguments to create many CourseModules.
     * @example
     * // Create many CourseModules
     * const courseModule = await prisma.courseModule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CourseModules and only return the `id`
     * const courseModuleWithIdOnly = await prisma.courseModule.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourseModuleCreateManyAndReturnArgs>(args?: SelectSubset<T, CourseModuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CourseModule.
     * @param {CourseModuleDeleteArgs} args - Arguments to delete one CourseModule.
     * @example
     * // Delete one CourseModule
     * const CourseModule = await prisma.courseModule.delete({
     *   where: {
     *     // ... filter to delete one CourseModule
     *   }
     * })
     * 
     */
    delete<T extends CourseModuleDeleteArgs>(args: SelectSubset<T, CourseModuleDeleteArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CourseModule.
     * @param {CourseModuleUpdateArgs} args - Arguments to update one CourseModule.
     * @example
     * // Update one CourseModule
     * const courseModule = await prisma.courseModule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourseModuleUpdateArgs>(args: SelectSubset<T, CourseModuleUpdateArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CourseModules.
     * @param {CourseModuleDeleteManyArgs} args - Arguments to filter CourseModules to delete.
     * @example
     * // Delete a few CourseModules
     * const { count } = await prisma.courseModule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourseModuleDeleteManyArgs>(args?: SelectSubset<T, CourseModuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourseModules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CourseModules
     * const courseModule = await prisma.courseModule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourseModuleUpdateManyArgs>(args: SelectSubset<T, CourseModuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourseModules and returns the data updated in the database.
     * @param {CourseModuleUpdateManyAndReturnArgs} args - Arguments to update many CourseModules.
     * @example
     * // Update many CourseModules
     * const courseModule = await prisma.courseModule.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CourseModules and only return the `id`
     * const courseModuleWithIdOnly = await prisma.courseModule.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourseModuleUpdateManyAndReturnArgs>(args: SelectSubset<T, CourseModuleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CourseModule.
     * @param {CourseModuleUpsertArgs} args - Arguments to update or create a CourseModule.
     * @example
     * // Update or create a CourseModule
     * const courseModule = await prisma.courseModule.upsert({
     *   create: {
     *     // ... data to create a CourseModule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CourseModule we want to update
     *   }
     * })
     */
    upsert<T extends CourseModuleUpsertArgs>(args: SelectSubset<T, CourseModuleUpsertArgs<ExtArgs>>): Prisma__CourseModuleClient<$Result.GetResult<Prisma.$CourseModulePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CourseModules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleCountArgs} args - Arguments to filter CourseModules to count.
     * @example
     * // Count the number of CourseModules
     * const count = await prisma.courseModule.count({
     *   where: {
     *     // ... the filter for the CourseModules we want to count
     *   }
     * })
    **/
    count<T extends CourseModuleCountArgs>(
      args?: Subset<T, CourseModuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourseModuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CourseModule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourseModuleAggregateArgs>(args: Subset<T, CourseModuleAggregateArgs>): Prisma.PrismaPromise<GetCourseModuleAggregateType<T>>

    /**
     * Group by CourseModule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseModuleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourseModuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourseModuleGroupByArgs['orderBy'] }
        : { orderBy?: CourseModuleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourseModuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourseModuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CourseModule model
   */
  readonly fields: CourseModuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CourseModule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourseModuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CourseModule model
   */
  interface CourseModuleFieldRefs {
    readonly id: FieldRef<"CourseModule", 'String'>
    readonly courseId: FieldRef<"CourseModule", 'String'>
    readonly title: FieldRef<"CourseModule", 'String'>
    readonly titleKey: FieldRef<"CourseModule", 'String'>
    readonly description: FieldRef<"CourseModule", 'String'>
    readonly sequenceNo: FieldRef<"CourseModule", 'Int'>
    readonly status: FieldRef<"CourseModule", 'RecordStatus'>
    readonly statusChangedAt: FieldRef<"CourseModule", 'DateTime'>
    readonly statusChangedBy: FieldRef<"CourseModule", 'String'>
    readonly createdBy: FieldRef<"CourseModule", 'String'>
    readonly updatedBy: FieldRef<"CourseModule", 'String'>
    readonly createdAt: FieldRef<"CourseModule", 'DateTime'>
    readonly updatedAt: FieldRef<"CourseModule", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CourseModule findUnique
   */
  export type CourseModuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter, which CourseModule to fetch.
     */
    where: CourseModuleWhereUniqueInput
  }

  /**
   * CourseModule findUniqueOrThrow
   */
  export type CourseModuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter, which CourseModule to fetch.
     */
    where: CourseModuleWhereUniqueInput
  }

  /**
   * CourseModule findFirst
   */
  export type CourseModuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter, which CourseModule to fetch.
     */
    where?: CourseModuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseModules to fetch.
     */
    orderBy?: CourseModuleOrderByWithRelationInput | CourseModuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourseModules.
     */
    cursor?: CourseModuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseModules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseModules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseModules.
     */
    distinct?: CourseModuleScalarFieldEnum | CourseModuleScalarFieldEnum[]
  }

  /**
   * CourseModule findFirstOrThrow
   */
  export type CourseModuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter, which CourseModule to fetch.
     */
    where?: CourseModuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseModules to fetch.
     */
    orderBy?: CourseModuleOrderByWithRelationInput | CourseModuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourseModules.
     */
    cursor?: CourseModuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseModules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseModules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseModules.
     */
    distinct?: CourseModuleScalarFieldEnum | CourseModuleScalarFieldEnum[]
  }

  /**
   * CourseModule findMany
   */
  export type CourseModuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter, which CourseModules to fetch.
     */
    where?: CourseModuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseModules to fetch.
     */
    orderBy?: CourseModuleOrderByWithRelationInput | CourseModuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CourseModules.
     */
    cursor?: CourseModuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseModules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseModules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseModules.
     */
    distinct?: CourseModuleScalarFieldEnum | CourseModuleScalarFieldEnum[]
  }

  /**
   * CourseModule create
   */
  export type CourseModuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * The data needed to create a CourseModule.
     */
    data: XOR<CourseModuleCreateInput, CourseModuleUncheckedCreateInput>
  }

  /**
   * CourseModule createMany
   */
  export type CourseModuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CourseModules.
     */
    data: CourseModuleCreateManyInput | CourseModuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CourseModule createManyAndReturn
   */
  export type CourseModuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * The data used to create many CourseModules.
     */
    data: CourseModuleCreateManyInput | CourseModuleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourseModule update
   */
  export type CourseModuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * The data needed to update a CourseModule.
     */
    data: XOR<CourseModuleUpdateInput, CourseModuleUncheckedUpdateInput>
    /**
     * Choose, which CourseModule to update.
     */
    where: CourseModuleWhereUniqueInput
  }

  /**
   * CourseModule updateMany
   */
  export type CourseModuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CourseModules.
     */
    data: XOR<CourseModuleUpdateManyMutationInput, CourseModuleUncheckedUpdateManyInput>
    /**
     * Filter which CourseModules to update
     */
    where?: CourseModuleWhereInput
    /**
     * Limit how many CourseModules to update.
     */
    limit?: number
  }

  /**
   * CourseModule updateManyAndReturn
   */
  export type CourseModuleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * The data used to update CourseModules.
     */
    data: XOR<CourseModuleUpdateManyMutationInput, CourseModuleUncheckedUpdateManyInput>
    /**
     * Filter which CourseModules to update
     */
    where?: CourseModuleWhereInput
    /**
     * Limit how many CourseModules to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourseModule upsert
   */
  export type CourseModuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * The filter to search for the CourseModule to update in case it exists.
     */
    where: CourseModuleWhereUniqueInput
    /**
     * In case the CourseModule found by the `where` argument doesn't exist, create a new CourseModule with this data.
     */
    create: XOR<CourseModuleCreateInput, CourseModuleUncheckedCreateInput>
    /**
     * In case the CourseModule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourseModuleUpdateInput, CourseModuleUncheckedUpdateInput>
  }

  /**
   * CourseModule delete
   */
  export type CourseModuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
    /**
     * Filter which CourseModule to delete.
     */
    where: CourseModuleWhereUniqueInput
  }

  /**
   * CourseModule deleteMany
   */
  export type CourseModuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourseModules to delete
     */
    where?: CourseModuleWhereInput
    /**
     * Limit how many CourseModules to delete.
     */
    limit?: number
  }

  /**
   * CourseModule without action
   */
  export type CourseModuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseModule
     */
    select?: CourseModuleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseModule
     */
    omit?: CourseModuleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseModuleInclude<ExtArgs> | null
  }


  /**
   * Model Batch
   */

  export type AggregateBatch = {
    _count: BatchCountAggregateOutputType | null
    _avg: BatchAvgAggregateOutputType | null
    _sum: BatchSumAggregateOutputType | null
    _min: BatchMinAggregateOutputType | null
    _max: BatchMaxAggregateOutputType | null
  }

  export type BatchAvgAggregateOutputType = {
    capacity: number | null
    enrolledCount: number | null
  }

  export type BatchSumAggregateOutputType = {
    capacity: number | null
    enrolledCount: number | null
  }

  export type BatchMinAggregateOutputType = {
    id: string | null
    courseId: string | null
    batchName: string | null
    batchNameKey: string | null
    description: string | null
    startDate: string | null
    endDate: string | null
    startTime: string | null
    endTime: string | null
    capacity: number | null
    enrolledCount: number | null
    status: $Enums.BatchStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BatchMaxAggregateOutputType = {
    id: string | null
    courseId: string | null
    batchName: string | null
    batchNameKey: string | null
    description: string | null
    startDate: string | null
    endDate: string | null
    startTime: string | null
    endTime: string | null
    capacity: number | null
    enrolledCount: number | null
    status: $Enums.BatchStatus | null
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BatchCountAggregateOutputType = {
    id: number
    courseId: number
    batchName: number
    batchNameKey: number
    description: number
    startDate: number
    endDate: number
    startTime: number
    endTime: number
    capacity: number
    enrolledCount: number
    status: number
    statusChangedAt: number
    statusChangedBy: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BatchAvgAggregateInputType = {
    capacity?: true
    enrolledCount?: true
  }

  export type BatchSumAggregateInputType = {
    capacity?: true
    enrolledCount?: true
  }

  export type BatchMinAggregateInputType = {
    id?: true
    courseId?: true
    batchName?: true
    batchNameKey?: true
    description?: true
    startDate?: true
    endDate?: true
    startTime?: true
    endTime?: true
    capacity?: true
    enrolledCount?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BatchMaxAggregateInputType = {
    id?: true
    courseId?: true
    batchName?: true
    batchNameKey?: true
    description?: true
    startDate?: true
    endDate?: true
    startTime?: true
    endTime?: true
    capacity?: true
    enrolledCount?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BatchCountAggregateInputType = {
    id?: true
    courseId?: true
    batchName?: true
    batchNameKey?: true
    description?: true
    startDate?: true
    endDate?: true
    startTime?: true
    endTime?: true
    capacity?: true
    enrolledCount?: true
    status?: true
    statusChangedAt?: true
    statusChangedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BatchAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Batch to aggregate.
     */
    where?: BatchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Batches to fetch.
     */
    orderBy?: BatchOrderByWithRelationInput | BatchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BatchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Batches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Batches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Batches
    **/
    _count?: true | BatchCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BatchAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BatchSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BatchMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BatchMaxAggregateInputType
  }

  export type GetBatchAggregateType<T extends BatchAggregateArgs> = {
        [P in keyof T & keyof AggregateBatch]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBatch[P]>
      : GetScalarType<T[P], AggregateBatch[P]>
  }




  export type BatchGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchWhereInput
    orderBy?: BatchOrderByWithAggregationInput | BatchOrderByWithAggregationInput[]
    by: BatchScalarFieldEnum[] | BatchScalarFieldEnum
    having?: BatchScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BatchCountAggregateInputType | true
    _avg?: BatchAvgAggregateInputType
    _sum?: BatchSumAggregateInputType
    _min?: BatchMinAggregateInputType
    _max?: BatchMaxAggregateInputType
  }

  export type BatchGroupByOutputType = {
    id: string
    courseId: string
    batchName: string
    batchNameKey: string
    description: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount: number
    status: $Enums.BatchStatus
    statusChangedAt: Date | null
    statusChangedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: BatchCountAggregateOutputType | null
    _avg: BatchAvgAggregateOutputType | null
    _sum: BatchSumAggregateOutputType | null
    _min: BatchMinAggregateOutputType | null
    _max: BatchMaxAggregateOutputType | null
  }

  type GetBatchGroupByPayload<T extends BatchGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BatchGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BatchGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BatchGroupByOutputType[P]>
            : GetScalarType<T[P], BatchGroupByOutputType[P]>
        }
      >
    >


  export type BatchSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    batchName?: boolean
    batchNameKey?: boolean
    description?: boolean
    startDate?: boolean
    endDate?: boolean
    startTime?: boolean
    endTime?: boolean
    capacity?: boolean
    enrolledCount?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    facultyAssignments?: boolean | Batch$facultyAssignmentsArgs<ExtArgs>
    statusHistory?: boolean | Batch$statusHistoryArgs<ExtArgs>
    _count?: boolean | BatchCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batch"]>

  export type BatchSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    batchName?: boolean
    batchNameKey?: boolean
    description?: boolean
    startDate?: boolean
    endDate?: boolean
    startTime?: boolean
    endTime?: boolean
    capacity?: boolean
    enrolledCount?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batch"]>

  export type BatchSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    batchName?: boolean
    batchNameKey?: boolean
    description?: boolean
    startDate?: boolean
    endDate?: boolean
    startTime?: boolean
    endTime?: boolean
    capacity?: boolean
    enrolledCount?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batch"]>

  export type BatchSelectScalar = {
    id?: boolean
    courseId?: boolean
    batchName?: boolean
    batchNameKey?: boolean
    description?: boolean
    startDate?: boolean
    endDate?: boolean
    startTime?: boolean
    endTime?: boolean
    capacity?: boolean
    enrolledCount?: boolean
    status?: boolean
    statusChangedAt?: boolean
    statusChangedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type BatchOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "courseId" | "batchName" | "batchNameKey" | "description" | "startDate" | "endDate" | "startTime" | "endTime" | "capacity" | "enrolledCount" | "status" | "statusChangedAt" | "statusChangedBy" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["batch"]>
  export type BatchInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    facultyAssignments?: boolean | Batch$facultyAssignmentsArgs<ExtArgs>
    statusHistory?: boolean | Batch$statusHistoryArgs<ExtArgs>
    _count?: boolean | BatchCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type BatchIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type BatchIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }

  export type $BatchPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Batch"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs>
      facultyAssignments: Prisma.$BatchFacultyAssignmentPayload<ExtArgs>[]
      statusHistory: Prisma.$BatchStatusHistoryPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      courseId: string
      batchName: string
      batchNameKey: string
      description: string | null
      startDate: string
      endDate: string
      startTime: string
      endTime: string
      capacity: number
      enrolledCount: number
      status: $Enums.BatchStatus
      statusChangedAt: Date | null
      statusChangedBy: string | null
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["batch"]>
    composites: {}
  }

  type BatchGetPayload<S extends boolean | null | undefined | BatchDefaultArgs> = $Result.GetResult<Prisma.$BatchPayload, S>

  type BatchCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BatchFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BatchCountAggregateInputType | true
    }

  export interface BatchDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Batch'], meta: { name: 'Batch' } }
    /**
     * Find zero or one Batch that matches the filter.
     * @param {BatchFindUniqueArgs} args - Arguments to find a Batch
     * @example
     * // Get one Batch
     * const batch = await prisma.batch.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BatchFindUniqueArgs>(args: SelectSubset<T, BatchFindUniqueArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Batch that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BatchFindUniqueOrThrowArgs} args - Arguments to find a Batch
     * @example
     * // Get one Batch
     * const batch = await prisma.batch.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BatchFindUniqueOrThrowArgs>(args: SelectSubset<T, BatchFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Batch that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFindFirstArgs} args - Arguments to find a Batch
     * @example
     * // Get one Batch
     * const batch = await prisma.batch.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BatchFindFirstArgs>(args?: SelectSubset<T, BatchFindFirstArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Batch that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFindFirstOrThrowArgs} args - Arguments to find a Batch
     * @example
     * // Get one Batch
     * const batch = await prisma.batch.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BatchFindFirstOrThrowArgs>(args?: SelectSubset<T, BatchFindFirstOrThrowArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Batches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Batches
     * const batches = await prisma.batch.findMany()
     * 
     * // Get first 10 Batches
     * const batches = await prisma.batch.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const batchWithIdOnly = await prisma.batch.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BatchFindManyArgs>(args?: SelectSubset<T, BatchFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Batch.
     * @param {BatchCreateArgs} args - Arguments to create a Batch.
     * @example
     * // Create one Batch
     * const Batch = await prisma.batch.create({
     *   data: {
     *     // ... data to create a Batch
     *   }
     * })
     * 
     */
    create<T extends BatchCreateArgs>(args: SelectSubset<T, BatchCreateArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Batches.
     * @param {BatchCreateManyArgs} args - Arguments to create many Batches.
     * @example
     * // Create many Batches
     * const batch = await prisma.batch.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BatchCreateManyArgs>(args?: SelectSubset<T, BatchCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Batches and returns the data saved in the database.
     * @param {BatchCreateManyAndReturnArgs} args - Arguments to create many Batches.
     * @example
     * // Create many Batches
     * const batch = await prisma.batch.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Batches and only return the `id`
     * const batchWithIdOnly = await prisma.batch.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BatchCreateManyAndReturnArgs>(args?: SelectSubset<T, BatchCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Batch.
     * @param {BatchDeleteArgs} args - Arguments to delete one Batch.
     * @example
     * // Delete one Batch
     * const Batch = await prisma.batch.delete({
     *   where: {
     *     // ... filter to delete one Batch
     *   }
     * })
     * 
     */
    delete<T extends BatchDeleteArgs>(args: SelectSubset<T, BatchDeleteArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Batch.
     * @param {BatchUpdateArgs} args - Arguments to update one Batch.
     * @example
     * // Update one Batch
     * const batch = await prisma.batch.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BatchUpdateArgs>(args: SelectSubset<T, BatchUpdateArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Batches.
     * @param {BatchDeleteManyArgs} args - Arguments to filter Batches to delete.
     * @example
     * // Delete a few Batches
     * const { count } = await prisma.batch.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BatchDeleteManyArgs>(args?: SelectSubset<T, BatchDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Batches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Batches
     * const batch = await prisma.batch.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BatchUpdateManyArgs>(args: SelectSubset<T, BatchUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Batches and returns the data updated in the database.
     * @param {BatchUpdateManyAndReturnArgs} args - Arguments to update many Batches.
     * @example
     * // Update many Batches
     * const batch = await prisma.batch.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Batches and only return the `id`
     * const batchWithIdOnly = await prisma.batch.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BatchUpdateManyAndReturnArgs>(args: SelectSubset<T, BatchUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Batch.
     * @param {BatchUpsertArgs} args - Arguments to update or create a Batch.
     * @example
     * // Update or create a Batch
     * const batch = await prisma.batch.upsert({
     *   create: {
     *     // ... data to create a Batch
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Batch we want to update
     *   }
     * })
     */
    upsert<T extends BatchUpsertArgs>(args: SelectSubset<T, BatchUpsertArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Batches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchCountArgs} args - Arguments to filter Batches to count.
     * @example
     * // Count the number of Batches
     * const count = await prisma.batch.count({
     *   where: {
     *     // ... the filter for the Batches we want to count
     *   }
     * })
    **/
    count<T extends BatchCountArgs>(
      args?: Subset<T, BatchCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BatchCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Batch.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BatchAggregateArgs>(args: Subset<T, BatchAggregateArgs>): Prisma.PrismaPromise<GetBatchAggregateType<T>>

    /**
     * Group by Batch.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BatchGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BatchGroupByArgs['orderBy'] }
        : { orderBy?: BatchGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BatchGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBatchGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Batch model
   */
  readonly fields: BatchFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Batch.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BatchClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    facultyAssignments<T extends Batch$facultyAssignmentsArgs<ExtArgs> = {}>(args?: Subset<T, Batch$facultyAssignmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    statusHistory<T extends Batch$statusHistoryArgs<ExtArgs> = {}>(args?: Subset<T, Batch$statusHistoryArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Batch model
   */
  interface BatchFieldRefs {
    readonly id: FieldRef<"Batch", 'String'>
    readonly courseId: FieldRef<"Batch", 'String'>
    readonly batchName: FieldRef<"Batch", 'String'>
    readonly batchNameKey: FieldRef<"Batch", 'String'>
    readonly description: FieldRef<"Batch", 'String'>
    readonly startDate: FieldRef<"Batch", 'String'>
    readonly endDate: FieldRef<"Batch", 'String'>
    readonly startTime: FieldRef<"Batch", 'String'>
    readonly endTime: FieldRef<"Batch", 'String'>
    readonly capacity: FieldRef<"Batch", 'Int'>
    readonly enrolledCount: FieldRef<"Batch", 'Int'>
    readonly status: FieldRef<"Batch", 'BatchStatus'>
    readonly statusChangedAt: FieldRef<"Batch", 'DateTime'>
    readonly statusChangedBy: FieldRef<"Batch", 'String'>
    readonly createdBy: FieldRef<"Batch", 'String'>
    readonly updatedBy: FieldRef<"Batch", 'String'>
    readonly createdAt: FieldRef<"Batch", 'DateTime'>
    readonly updatedAt: FieldRef<"Batch", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Batch findUnique
   */
  export type BatchFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter, which Batch to fetch.
     */
    where: BatchWhereUniqueInput
  }

  /**
   * Batch findUniqueOrThrow
   */
  export type BatchFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter, which Batch to fetch.
     */
    where: BatchWhereUniqueInput
  }

  /**
   * Batch findFirst
   */
  export type BatchFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter, which Batch to fetch.
     */
    where?: BatchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Batches to fetch.
     */
    orderBy?: BatchOrderByWithRelationInput | BatchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Batches.
     */
    cursor?: BatchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Batches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Batches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Batches.
     */
    distinct?: BatchScalarFieldEnum | BatchScalarFieldEnum[]
  }

  /**
   * Batch findFirstOrThrow
   */
  export type BatchFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter, which Batch to fetch.
     */
    where?: BatchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Batches to fetch.
     */
    orderBy?: BatchOrderByWithRelationInput | BatchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Batches.
     */
    cursor?: BatchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Batches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Batches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Batches.
     */
    distinct?: BatchScalarFieldEnum | BatchScalarFieldEnum[]
  }

  /**
   * Batch findMany
   */
  export type BatchFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter, which Batches to fetch.
     */
    where?: BatchWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Batches to fetch.
     */
    orderBy?: BatchOrderByWithRelationInput | BatchOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Batches.
     */
    cursor?: BatchWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Batches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Batches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Batches.
     */
    distinct?: BatchScalarFieldEnum | BatchScalarFieldEnum[]
  }

  /**
   * Batch create
   */
  export type BatchCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * The data needed to create a Batch.
     */
    data: XOR<BatchCreateInput, BatchUncheckedCreateInput>
  }

  /**
   * Batch createMany
   */
  export type BatchCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Batches.
     */
    data: BatchCreateManyInput | BatchCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Batch createManyAndReturn
   */
  export type BatchCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * The data used to create many Batches.
     */
    data: BatchCreateManyInput | BatchCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Batch update
   */
  export type BatchUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * The data needed to update a Batch.
     */
    data: XOR<BatchUpdateInput, BatchUncheckedUpdateInput>
    /**
     * Choose, which Batch to update.
     */
    where: BatchWhereUniqueInput
  }

  /**
   * Batch updateMany
   */
  export type BatchUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Batches.
     */
    data: XOR<BatchUpdateManyMutationInput, BatchUncheckedUpdateManyInput>
    /**
     * Filter which Batches to update
     */
    where?: BatchWhereInput
    /**
     * Limit how many Batches to update.
     */
    limit?: number
  }

  /**
   * Batch updateManyAndReturn
   */
  export type BatchUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * The data used to update Batches.
     */
    data: XOR<BatchUpdateManyMutationInput, BatchUncheckedUpdateManyInput>
    /**
     * Filter which Batches to update
     */
    where?: BatchWhereInput
    /**
     * Limit how many Batches to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Batch upsert
   */
  export type BatchUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * The filter to search for the Batch to update in case it exists.
     */
    where: BatchWhereUniqueInput
    /**
     * In case the Batch found by the `where` argument doesn't exist, create a new Batch with this data.
     */
    create: XOR<BatchCreateInput, BatchUncheckedCreateInput>
    /**
     * In case the Batch was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BatchUpdateInput, BatchUncheckedUpdateInput>
  }

  /**
   * Batch delete
   */
  export type BatchDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
    /**
     * Filter which Batch to delete.
     */
    where: BatchWhereUniqueInput
  }

  /**
   * Batch deleteMany
   */
  export type BatchDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Batches to delete
     */
    where?: BatchWhereInput
    /**
     * Limit how many Batches to delete.
     */
    limit?: number
  }

  /**
   * Batch.facultyAssignments
   */
  export type Batch$facultyAssignmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    where?: BatchFacultyAssignmentWhereInput
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BatchFacultyAssignmentScalarFieldEnum | BatchFacultyAssignmentScalarFieldEnum[]
  }

  /**
   * Batch.statusHistory
   */
  export type Batch$statusHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    where?: BatchStatusHistoryWhereInput
    orderBy?: BatchStatusHistoryOrderByWithRelationInput | BatchStatusHistoryOrderByWithRelationInput[]
    cursor?: BatchStatusHistoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BatchStatusHistoryScalarFieldEnum | BatchStatusHistoryScalarFieldEnum[]
  }

  /**
   * Batch without action
   */
  export type BatchDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Batch
     */
    select?: BatchSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Batch
     */
    omit?: BatchOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchInclude<ExtArgs> | null
  }


  /**
   * Model BatchFacultyAssignment
   */

  export type AggregateBatchFacultyAssignment = {
    _count: BatchFacultyAssignmentCountAggregateOutputType | null
    _min: BatchFacultyAssignmentMinAggregateOutputType | null
    _max: BatchFacultyAssignmentMaxAggregateOutputType | null
  }

  export type BatchFacultyAssignmentMinAggregateOutputType = {
    id: string | null
    batchId: string | null
    facultyId: string | null
    assignedDate: string | null
    assignedAt: Date | null
    releasedAt: Date | null
    status: $Enums.AssignmentStatus | null
    notes: string | null
    assignedBy: string | null
    releasedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BatchFacultyAssignmentMaxAggregateOutputType = {
    id: string | null
    batchId: string | null
    facultyId: string | null
    assignedDate: string | null
    assignedAt: Date | null
    releasedAt: Date | null
    status: $Enums.AssignmentStatus | null
    notes: string | null
    assignedBy: string | null
    releasedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BatchFacultyAssignmentCountAggregateOutputType = {
    id: number
    batchId: number
    facultyId: number
    assignedDate: number
    assignedAt: number
    releasedAt: number
    status: number
    notes: number
    assignedBy: number
    releasedBy: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BatchFacultyAssignmentMinAggregateInputType = {
    id?: true
    batchId?: true
    facultyId?: true
    assignedDate?: true
    assignedAt?: true
    releasedAt?: true
    status?: true
    notes?: true
    assignedBy?: true
    releasedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BatchFacultyAssignmentMaxAggregateInputType = {
    id?: true
    batchId?: true
    facultyId?: true
    assignedDate?: true
    assignedAt?: true
    releasedAt?: true
    status?: true
    notes?: true
    assignedBy?: true
    releasedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BatchFacultyAssignmentCountAggregateInputType = {
    id?: true
    batchId?: true
    facultyId?: true
    assignedDate?: true
    assignedAt?: true
    releasedAt?: true
    status?: true
    notes?: true
    assignedBy?: true
    releasedBy?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BatchFacultyAssignmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BatchFacultyAssignment to aggregate.
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchFacultyAssignments to fetch.
     */
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchFacultyAssignments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchFacultyAssignments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BatchFacultyAssignments
    **/
    _count?: true | BatchFacultyAssignmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BatchFacultyAssignmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BatchFacultyAssignmentMaxAggregateInputType
  }

  export type GetBatchFacultyAssignmentAggregateType<T extends BatchFacultyAssignmentAggregateArgs> = {
        [P in keyof T & keyof AggregateBatchFacultyAssignment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBatchFacultyAssignment[P]>
      : GetScalarType<T[P], AggregateBatchFacultyAssignment[P]>
  }




  export type BatchFacultyAssignmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchFacultyAssignmentWhereInput
    orderBy?: BatchFacultyAssignmentOrderByWithAggregationInput | BatchFacultyAssignmentOrderByWithAggregationInput[]
    by: BatchFacultyAssignmentScalarFieldEnum[] | BatchFacultyAssignmentScalarFieldEnum
    having?: BatchFacultyAssignmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BatchFacultyAssignmentCountAggregateInputType | true
    _min?: BatchFacultyAssignmentMinAggregateInputType
    _max?: BatchFacultyAssignmentMaxAggregateInputType
  }

  export type BatchFacultyAssignmentGroupByOutputType = {
    id: string
    batchId: string
    facultyId: string
    assignedDate: string
    assignedAt: Date
    releasedAt: Date | null
    status: $Enums.AssignmentStatus
    notes: string | null
    assignedBy: string | null
    releasedBy: string | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: BatchFacultyAssignmentCountAggregateOutputType | null
    _min: BatchFacultyAssignmentMinAggregateOutputType | null
    _max: BatchFacultyAssignmentMaxAggregateOutputType | null
  }

  type GetBatchFacultyAssignmentGroupByPayload<T extends BatchFacultyAssignmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BatchFacultyAssignmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BatchFacultyAssignmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BatchFacultyAssignmentGroupByOutputType[P]>
            : GetScalarType<T[P], BatchFacultyAssignmentGroupByOutputType[P]>
        }
      >
    >


  export type BatchFacultyAssignmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    facultyId?: boolean
    assignedDate?: boolean
    assignedAt?: boolean
    releasedAt?: boolean
    status?: boolean
    notes?: boolean
    assignedBy?: boolean
    releasedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchFacultyAssignment"]>

  export type BatchFacultyAssignmentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    facultyId?: boolean
    assignedDate?: boolean
    assignedAt?: boolean
    releasedAt?: boolean
    status?: boolean
    notes?: boolean
    assignedBy?: boolean
    releasedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchFacultyAssignment"]>

  export type BatchFacultyAssignmentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    facultyId?: boolean
    assignedDate?: boolean
    assignedAt?: boolean
    releasedAt?: boolean
    status?: boolean
    notes?: boolean
    assignedBy?: boolean
    releasedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchFacultyAssignment"]>

  export type BatchFacultyAssignmentSelectScalar = {
    id?: boolean
    batchId?: boolean
    facultyId?: boolean
    assignedDate?: boolean
    assignedAt?: boolean
    releasedAt?: boolean
    status?: boolean
    notes?: boolean
    assignedBy?: boolean
    releasedBy?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type BatchFacultyAssignmentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "batchId" | "facultyId" | "assignedDate" | "assignedAt" | "releasedAt" | "status" | "notes" | "assignedBy" | "releasedBy" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["batchFacultyAssignment"]>
  export type BatchFacultyAssignmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type BatchFacultyAssignmentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type BatchFacultyAssignmentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
    faculty?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $BatchFacultyAssignmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BatchFacultyAssignment"
    objects: {
      batch: Prisma.$BatchPayload<ExtArgs>
      faculty: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      batchId: string
      facultyId: string
      assignedDate: string
      assignedAt: Date
      releasedAt: Date | null
      status: $Enums.AssignmentStatus
      notes: string | null
      assignedBy: string | null
      releasedBy: string | null
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["batchFacultyAssignment"]>
    composites: {}
  }

  type BatchFacultyAssignmentGetPayload<S extends boolean | null | undefined | BatchFacultyAssignmentDefaultArgs> = $Result.GetResult<Prisma.$BatchFacultyAssignmentPayload, S>

  type BatchFacultyAssignmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BatchFacultyAssignmentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BatchFacultyAssignmentCountAggregateInputType | true
    }

  export interface BatchFacultyAssignmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BatchFacultyAssignment'], meta: { name: 'BatchFacultyAssignment' } }
    /**
     * Find zero or one BatchFacultyAssignment that matches the filter.
     * @param {BatchFacultyAssignmentFindUniqueArgs} args - Arguments to find a BatchFacultyAssignment
     * @example
     * // Get one BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BatchFacultyAssignmentFindUniqueArgs>(args: SelectSubset<T, BatchFacultyAssignmentFindUniqueArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BatchFacultyAssignment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BatchFacultyAssignmentFindUniqueOrThrowArgs} args - Arguments to find a BatchFacultyAssignment
     * @example
     * // Get one BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BatchFacultyAssignmentFindUniqueOrThrowArgs>(args: SelectSubset<T, BatchFacultyAssignmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BatchFacultyAssignment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentFindFirstArgs} args - Arguments to find a BatchFacultyAssignment
     * @example
     * // Get one BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BatchFacultyAssignmentFindFirstArgs>(args?: SelectSubset<T, BatchFacultyAssignmentFindFirstArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BatchFacultyAssignment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentFindFirstOrThrowArgs} args - Arguments to find a BatchFacultyAssignment
     * @example
     * // Get one BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BatchFacultyAssignmentFindFirstOrThrowArgs>(args?: SelectSubset<T, BatchFacultyAssignmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BatchFacultyAssignments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BatchFacultyAssignments
     * const batchFacultyAssignments = await prisma.batchFacultyAssignment.findMany()
     * 
     * // Get first 10 BatchFacultyAssignments
     * const batchFacultyAssignments = await prisma.batchFacultyAssignment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const batchFacultyAssignmentWithIdOnly = await prisma.batchFacultyAssignment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BatchFacultyAssignmentFindManyArgs>(args?: SelectSubset<T, BatchFacultyAssignmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BatchFacultyAssignment.
     * @param {BatchFacultyAssignmentCreateArgs} args - Arguments to create a BatchFacultyAssignment.
     * @example
     * // Create one BatchFacultyAssignment
     * const BatchFacultyAssignment = await prisma.batchFacultyAssignment.create({
     *   data: {
     *     // ... data to create a BatchFacultyAssignment
     *   }
     * })
     * 
     */
    create<T extends BatchFacultyAssignmentCreateArgs>(args: SelectSubset<T, BatchFacultyAssignmentCreateArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BatchFacultyAssignments.
     * @param {BatchFacultyAssignmentCreateManyArgs} args - Arguments to create many BatchFacultyAssignments.
     * @example
     * // Create many BatchFacultyAssignments
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BatchFacultyAssignmentCreateManyArgs>(args?: SelectSubset<T, BatchFacultyAssignmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BatchFacultyAssignments and returns the data saved in the database.
     * @param {BatchFacultyAssignmentCreateManyAndReturnArgs} args - Arguments to create many BatchFacultyAssignments.
     * @example
     * // Create many BatchFacultyAssignments
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BatchFacultyAssignments and only return the `id`
     * const batchFacultyAssignmentWithIdOnly = await prisma.batchFacultyAssignment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BatchFacultyAssignmentCreateManyAndReturnArgs>(args?: SelectSubset<T, BatchFacultyAssignmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BatchFacultyAssignment.
     * @param {BatchFacultyAssignmentDeleteArgs} args - Arguments to delete one BatchFacultyAssignment.
     * @example
     * // Delete one BatchFacultyAssignment
     * const BatchFacultyAssignment = await prisma.batchFacultyAssignment.delete({
     *   where: {
     *     // ... filter to delete one BatchFacultyAssignment
     *   }
     * })
     * 
     */
    delete<T extends BatchFacultyAssignmentDeleteArgs>(args: SelectSubset<T, BatchFacultyAssignmentDeleteArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BatchFacultyAssignment.
     * @param {BatchFacultyAssignmentUpdateArgs} args - Arguments to update one BatchFacultyAssignment.
     * @example
     * // Update one BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BatchFacultyAssignmentUpdateArgs>(args: SelectSubset<T, BatchFacultyAssignmentUpdateArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BatchFacultyAssignments.
     * @param {BatchFacultyAssignmentDeleteManyArgs} args - Arguments to filter BatchFacultyAssignments to delete.
     * @example
     * // Delete a few BatchFacultyAssignments
     * const { count } = await prisma.batchFacultyAssignment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BatchFacultyAssignmentDeleteManyArgs>(args?: SelectSubset<T, BatchFacultyAssignmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BatchFacultyAssignments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BatchFacultyAssignments
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BatchFacultyAssignmentUpdateManyArgs>(args: SelectSubset<T, BatchFacultyAssignmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BatchFacultyAssignments and returns the data updated in the database.
     * @param {BatchFacultyAssignmentUpdateManyAndReturnArgs} args - Arguments to update many BatchFacultyAssignments.
     * @example
     * // Update many BatchFacultyAssignments
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BatchFacultyAssignments and only return the `id`
     * const batchFacultyAssignmentWithIdOnly = await prisma.batchFacultyAssignment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BatchFacultyAssignmentUpdateManyAndReturnArgs>(args: SelectSubset<T, BatchFacultyAssignmentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BatchFacultyAssignment.
     * @param {BatchFacultyAssignmentUpsertArgs} args - Arguments to update or create a BatchFacultyAssignment.
     * @example
     * // Update or create a BatchFacultyAssignment
     * const batchFacultyAssignment = await prisma.batchFacultyAssignment.upsert({
     *   create: {
     *     // ... data to create a BatchFacultyAssignment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BatchFacultyAssignment we want to update
     *   }
     * })
     */
    upsert<T extends BatchFacultyAssignmentUpsertArgs>(args: SelectSubset<T, BatchFacultyAssignmentUpsertArgs<ExtArgs>>): Prisma__BatchFacultyAssignmentClient<$Result.GetResult<Prisma.$BatchFacultyAssignmentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BatchFacultyAssignments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentCountArgs} args - Arguments to filter BatchFacultyAssignments to count.
     * @example
     * // Count the number of BatchFacultyAssignments
     * const count = await prisma.batchFacultyAssignment.count({
     *   where: {
     *     // ... the filter for the BatchFacultyAssignments we want to count
     *   }
     * })
    **/
    count<T extends BatchFacultyAssignmentCountArgs>(
      args?: Subset<T, BatchFacultyAssignmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BatchFacultyAssignmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BatchFacultyAssignment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BatchFacultyAssignmentAggregateArgs>(args: Subset<T, BatchFacultyAssignmentAggregateArgs>): Prisma.PrismaPromise<GetBatchFacultyAssignmentAggregateType<T>>

    /**
     * Group by BatchFacultyAssignment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchFacultyAssignmentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BatchFacultyAssignmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BatchFacultyAssignmentGroupByArgs['orderBy'] }
        : { orderBy?: BatchFacultyAssignmentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BatchFacultyAssignmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBatchFacultyAssignmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BatchFacultyAssignment model
   */
  readonly fields: BatchFacultyAssignmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BatchFacultyAssignment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BatchFacultyAssignmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    batch<T extends BatchDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BatchDefaultArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    faculty<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BatchFacultyAssignment model
   */
  interface BatchFacultyAssignmentFieldRefs {
    readonly id: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly batchId: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly facultyId: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly assignedDate: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly assignedAt: FieldRef<"BatchFacultyAssignment", 'DateTime'>
    readonly releasedAt: FieldRef<"BatchFacultyAssignment", 'DateTime'>
    readonly status: FieldRef<"BatchFacultyAssignment", 'AssignmentStatus'>
    readonly notes: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly assignedBy: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly releasedBy: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly createdBy: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly updatedBy: FieldRef<"BatchFacultyAssignment", 'String'>
    readonly createdAt: FieldRef<"BatchFacultyAssignment", 'DateTime'>
    readonly updatedAt: FieldRef<"BatchFacultyAssignment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BatchFacultyAssignment findUnique
   */
  export type BatchFacultyAssignmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter, which BatchFacultyAssignment to fetch.
     */
    where: BatchFacultyAssignmentWhereUniqueInput
  }

  /**
   * BatchFacultyAssignment findUniqueOrThrow
   */
  export type BatchFacultyAssignmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter, which BatchFacultyAssignment to fetch.
     */
    where: BatchFacultyAssignmentWhereUniqueInput
  }

  /**
   * BatchFacultyAssignment findFirst
   */
  export type BatchFacultyAssignmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter, which BatchFacultyAssignment to fetch.
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchFacultyAssignments to fetch.
     */
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BatchFacultyAssignments.
     */
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchFacultyAssignments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchFacultyAssignments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchFacultyAssignments.
     */
    distinct?: BatchFacultyAssignmentScalarFieldEnum | BatchFacultyAssignmentScalarFieldEnum[]
  }

  /**
   * BatchFacultyAssignment findFirstOrThrow
   */
  export type BatchFacultyAssignmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter, which BatchFacultyAssignment to fetch.
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchFacultyAssignments to fetch.
     */
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BatchFacultyAssignments.
     */
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchFacultyAssignments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchFacultyAssignments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchFacultyAssignments.
     */
    distinct?: BatchFacultyAssignmentScalarFieldEnum | BatchFacultyAssignmentScalarFieldEnum[]
  }

  /**
   * BatchFacultyAssignment findMany
   */
  export type BatchFacultyAssignmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter, which BatchFacultyAssignments to fetch.
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchFacultyAssignments to fetch.
     */
    orderBy?: BatchFacultyAssignmentOrderByWithRelationInput | BatchFacultyAssignmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BatchFacultyAssignments.
     */
    cursor?: BatchFacultyAssignmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchFacultyAssignments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchFacultyAssignments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchFacultyAssignments.
     */
    distinct?: BatchFacultyAssignmentScalarFieldEnum | BatchFacultyAssignmentScalarFieldEnum[]
  }

  /**
   * BatchFacultyAssignment create
   */
  export type BatchFacultyAssignmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * The data needed to create a BatchFacultyAssignment.
     */
    data: XOR<BatchFacultyAssignmentCreateInput, BatchFacultyAssignmentUncheckedCreateInput>
  }

  /**
   * BatchFacultyAssignment createMany
   */
  export type BatchFacultyAssignmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BatchFacultyAssignments.
     */
    data: BatchFacultyAssignmentCreateManyInput | BatchFacultyAssignmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BatchFacultyAssignment createManyAndReturn
   */
  export type BatchFacultyAssignmentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * The data used to create many BatchFacultyAssignments.
     */
    data: BatchFacultyAssignmentCreateManyInput | BatchFacultyAssignmentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BatchFacultyAssignment update
   */
  export type BatchFacultyAssignmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * The data needed to update a BatchFacultyAssignment.
     */
    data: XOR<BatchFacultyAssignmentUpdateInput, BatchFacultyAssignmentUncheckedUpdateInput>
    /**
     * Choose, which BatchFacultyAssignment to update.
     */
    where: BatchFacultyAssignmentWhereUniqueInput
  }

  /**
   * BatchFacultyAssignment updateMany
   */
  export type BatchFacultyAssignmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BatchFacultyAssignments.
     */
    data: XOR<BatchFacultyAssignmentUpdateManyMutationInput, BatchFacultyAssignmentUncheckedUpdateManyInput>
    /**
     * Filter which BatchFacultyAssignments to update
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * Limit how many BatchFacultyAssignments to update.
     */
    limit?: number
  }

  /**
   * BatchFacultyAssignment updateManyAndReturn
   */
  export type BatchFacultyAssignmentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * The data used to update BatchFacultyAssignments.
     */
    data: XOR<BatchFacultyAssignmentUpdateManyMutationInput, BatchFacultyAssignmentUncheckedUpdateManyInput>
    /**
     * Filter which BatchFacultyAssignments to update
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * Limit how many BatchFacultyAssignments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BatchFacultyAssignment upsert
   */
  export type BatchFacultyAssignmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * The filter to search for the BatchFacultyAssignment to update in case it exists.
     */
    where: BatchFacultyAssignmentWhereUniqueInput
    /**
     * In case the BatchFacultyAssignment found by the `where` argument doesn't exist, create a new BatchFacultyAssignment with this data.
     */
    create: XOR<BatchFacultyAssignmentCreateInput, BatchFacultyAssignmentUncheckedCreateInput>
    /**
     * In case the BatchFacultyAssignment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BatchFacultyAssignmentUpdateInput, BatchFacultyAssignmentUncheckedUpdateInput>
  }

  /**
   * BatchFacultyAssignment delete
   */
  export type BatchFacultyAssignmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
    /**
     * Filter which BatchFacultyAssignment to delete.
     */
    where: BatchFacultyAssignmentWhereUniqueInput
  }

  /**
   * BatchFacultyAssignment deleteMany
   */
  export type BatchFacultyAssignmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BatchFacultyAssignments to delete
     */
    where?: BatchFacultyAssignmentWhereInput
    /**
     * Limit how many BatchFacultyAssignments to delete.
     */
    limit?: number
  }

  /**
   * BatchFacultyAssignment without action
   */
  export type BatchFacultyAssignmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchFacultyAssignment
     */
    select?: BatchFacultyAssignmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchFacultyAssignment
     */
    omit?: BatchFacultyAssignmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchFacultyAssignmentInclude<ExtArgs> | null
  }


  /**
   * Model CourseStatusHistory
   */

  export type AggregateCourseStatusHistory = {
    _count: CourseStatusHistoryCountAggregateOutputType | null
    _min: CourseStatusHistoryMinAggregateOutputType | null
    _max: CourseStatusHistoryMaxAggregateOutputType | null
  }

  export type CourseStatusHistoryMinAggregateOutputType = {
    id: string | null
    courseId: string | null
    fromStatus: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus | null
    changedBy: string | null
    reason: string | null
    changedAt: Date | null
  }

  export type CourseStatusHistoryMaxAggregateOutputType = {
    id: string | null
    courseId: string | null
    fromStatus: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus | null
    changedBy: string | null
    reason: string | null
    changedAt: Date | null
  }

  export type CourseStatusHistoryCountAggregateOutputType = {
    id: number
    courseId: number
    fromStatus: number
    toStatus: number
    changedBy: number
    reason: number
    changedAt: number
    _all: number
  }


  export type CourseStatusHistoryMinAggregateInputType = {
    id?: true
    courseId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
  }

  export type CourseStatusHistoryMaxAggregateInputType = {
    id?: true
    courseId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
  }

  export type CourseStatusHistoryCountAggregateInputType = {
    id?: true
    courseId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
    _all?: true
  }

  export type CourseStatusHistoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourseStatusHistory to aggregate.
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseStatusHistories to fetch.
     */
    orderBy?: CourseStatusHistoryOrderByWithRelationInput | CourseStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourseStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CourseStatusHistories
    **/
    _count?: true | CourseStatusHistoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourseStatusHistoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourseStatusHistoryMaxAggregateInputType
  }

  export type GetCourseStatusHistoryAggregateType<T extends CourseStatusHistoryAggregateArgs> = {
        [P in keyof T & keyof AggregateCourseStatusHistory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourseStatusHistory[P]>
      : GetScalarType<T[P], AggregateCourseStatusHistory[P]>
  }




  export type CourseStatusHistoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CourseStatusHistoryWhereInput
    orderBy?: CourseStatusHistoryOrderByWithAggregationInput | CourseStatusHistoryOrderByWithAggregationInput[]
    by: CourseStatusHistoryScalarFieldEnum[] | CourseStatusHistoryScalarFieldEnum
    having?: CourseStatusHistoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourseStatusHistoryCountAggregateInputType | true
    _min?: CourseStatusHistoryMinAggregateInputType
    _max?: CourseStatusHistoryMaxAggregateInputType
  }

  export type CourseStatusHistoryGroupByOutputType = {
    id: string
    courseId: string
    fromStatus: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy: string | null
    reason: string | null
    changedAt: Date
    _count: CourseStatusHistoryCountAggregateOutputType | null
    _min: CourseStatusHistoryMinAggregateOutputType | null
    _max: CourseStatusHistoryMaxAggregateOutputType | null
  }

  type GetCourseStatusHistoryGroupByPayload<T extends CourseStatusHistoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourseStatusHistoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourseStatusHistoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourseStatusHistoryGroupByOutputType[P]>
            : GetScalarType<T[P], CourseStatusHistoryGroupByOutputType[P]>
        }
      >
    >


  export type CourseStatusHistorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseStatusHistory"]>

  export type CourseStatusHistorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseStatusHistory"]>

  export type CourseStatusHistorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    courseId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["courseStatusHistory"]>

  export type CourseStatusHistorySelectScalar = {
    id?: boolean
    courseId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
  }

  export type CourseStatusHistoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "courseId" | "fromStatus" | "toStatus" | "changedBy" | "reason" | "changedAt", ExtArgs["result"]["courseStatusHistory"]>
  export type CourseStatusHistoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type CourseStatusHistoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type CourseStatusHistoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }

  export type $CourseStatusHistoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CourseStatusHistory"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      courseId: string
      fromStatus: $Enums.RecordStatus | null
      toStatus: $Enums.RecordStatus
      changedBy: string | null
      reason: string | null
      changedAt: Date
    }, ExtArgs["result"]["courseStatusHistory"]>
    composites: {}
  }

  type CourseStatusHistoryGetPayload<S extends boolean | null | undefined | CourseStatusHistoryDefaultArgs> = $Result.GetResult<Prisma.$CourseStatusHistoryPayload, S>

  type CourseStatusHistoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CourseStatusHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourseStatusHistoryCountAggregateInputType | true
    }

  export interface CourseStatusHistoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CourseStatusHistory'], meta: { name: 'CourseStatusHistory' } }
    /**
     * Find zero or one CourseStatusHistory that matches the filter.
     * @param {CourseStatusHistoryFindUniqueArgs} args - Arguments to find a CourseStatusHistory
     * @example
     * // Get one CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourseStatusHistoryFindUniqueArgs>(args: SelectSubset<T, CourseStatusHistoryFindUniqueArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CourseStatusHistory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourseStatusHistoryFindUniqueOrThrowArgs} args - Arguments to find a CourseStatusHistory
     * @example
     * // Get one CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourseStatusHistoryFindUniqueOrThrowArgs>(args: SelectSubset<T, CourseStatusHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourseStatusHistory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryFindFirstArgs} args - Arguments to find a CourseStatusHistory
     * @example
     * // Get one CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourseStatusHistoryFindFirstArgs>(args?: SelectSubset<T, CourseStatusHistoryFindFirstArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CourseStatusHistory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryFindFirstOrThrowArgs} args - Arguments to find a CourseStatusHistory
     * @example
     * // Get one CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourseStatusHistoryFindFirstOrThrowArgs>(args?: SelectSubset<T, CourseStatusHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CourseStatusHistories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CourseStatusHistories
     * const courseStatusHistories = await prisma.courseStatusHistory.findMany()
     * 
     * // Get first 10 CourseStatusHistories
     * const courseStatusHistories = await prisma.courseStatusHistory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courseStatusHistoryWithIdOnly = await prisma.courseStatusHistory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourseStatusHistoryFindManyArgs>(args?: SelectSubset<T, CourseStatusHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CourseStatusHistory.
     * @param {CourseStatusHistoryCreateArgs} args - Arguments to create a CourseStatusHistory.
     * @example
     * // Create one CourseStatusHistory
     * const CourseStatusHistory = await prisma.courseStatusHistory.create({
     *   data: {
     *     // ... data to create a CourseStatusHistory
     *   }
     * })
     * 
     */
    create<T extends CourseStatusHistoryCreateArgs>(args: SelectSubset<T, CourseStatusHistoryCreateArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CourseStatusHistories.
     * @param {CourseStatusHistoryCreateManyArgs} args - Arguments to create many CourseStatusHistories.
     * @example
     * // Create many CourseStatusHistories
     * const courseStatusHistory = await prisma.courseStatusHistory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourseStatusHistoryCreateManyArgs>(args?: SelectSubset<T, CourseStatusHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CourseStatusHistories and returns the data saved in the database.
     * @param {CourseStatusHistoryCreateManyAndReturnArgs} args - Arguments to create many CourseStatusHistories.
     * @example
     * // Create many CourseStatusHistories
     * const courseStatusHistory = await prisma.courseStatusHistory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CourseStatusHistories and only return the `id`
     * const courseStatusHistoryWithIdOnly = await prisma.courseStatusHistory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourseStatusHistoryCreateManyAndReturnArgs>(args?: SelectSubset<T, CourseStatusHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CourseStatusHistory.
     * @param {CourseStatusHistoryDeleteArgs} args - Arguments to delete one CourseStatusHistory.
     * @example
     * // Delete one CourseStatusHistory
     * const CourseStatusHistory = await prisma.courseStatusHistory.delete({
     *   where: {
     *     // ... filter to delete one CourseStatusHistory
     *   }
     * })
     * 
     */
    delete<T extends CourseStatusHistoryDeleteArgs>(args: SelectSubset<T, CourseStatusHistoryDeleteArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CourseStatusHistory.
     * @param {CourseStatusHistoryUpdateArgs} args - Arguments to update one CourseStatusHistory.
     * @example
     * // Update one CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourseStatusHistoryUpdateArgs>(args: SelectSubset<T, CourseStatusHistoryUpdateArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CourseStatusHistories.
     * @param {CourseStatusHistoryDeleteManyArgs} args - Arguments to filter CourseStatusHistories to delete.
     * @example
     * // Delete a few CourseStatusHistories
     * const { count } = await prisma.courseStatusHistory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourseStatusHistoryDeleteManyArgs>(args?: SelectSubset<T, CourseStatusHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourseStatusHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CourseStatusHistories
     * const courseStatusHistory = await prisma.courseStatusHistory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourseStatusHistoryUpdateManyArgs>(args: SelectSubset<T, CourseStatusHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CourseStatusHistories and returns the data updated in the database.
     * @param {CourseStatusHistoryUpdateManyAndReturnArgs} args - Arguments to update many CourseStatusHistories.
     * @example
     * // Update many CourseStatusHistories
     * const courseStatusHistory = await prisma.courseStatusHistory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CourseStatusHistories and only return the `id`
     * const courseStatusHistoryWithIdOnly = await prisma.courseStatusHistory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourseStatusHistoryUpdateManyAndReturnArgs>(args: SelectSubset<T, CourseStatusHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CourseStatusHistory.
     * @param {CourseStatusHistoryUpsertArgs} args - Arguments to update or create a CourseStatusHistory.
     * @example
     * // Update or create a CourseStatusHistory
     * const courseStatusHistory = await prisma.courseStatusHistory.upsert({
     *   create: {
     *     // ... data to create a CourseStatusHistory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CourseStatusHistory we want to update
     *   }
     * })
     */
    upsert<T extends CourseStatusHistoryUpsertArgs>(args: SelectSubset<T, CourseStatusHistoryUpsertArgs<ExtArgs>>): Prisma__CourseStatusHistoryClient<$Result.GetResult<Prisma.$CourseStatusHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CourseStatusHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryCountArgs} args - Arguments to filter CourseStatusHistories to count.
     * @example
     * // Count the number of CourseStatusHistories
     * const count = await prisma.courseStatusHistory.count({
     *   where: {
     *     // ... the filter for the CourseStatusHistories we want to count
     *   }
     * })
    **/
    count<T extends CourseStatusHistoryCountArgs>(
      args?: Subset<T, CourseStatusHistoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourseStatusHistoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CourseStatusHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourseStatusHistoryAggregateArgs>(args: Subset<T, CourseStatusHistoryAggregateArgs>): Prisma.PrismaPromise<GetCourseStatusHistoryAggregateType<T>>

    /**
     * Group by CourseStatusHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseStatusHistoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourseStatusHistoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourseStatusHistoryGroupByArgs['orderBy'] }
        : { orderBy?: CourseStatusHistoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourseStatusHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourseStatusHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CourseStatusHistory model
   */
  readonly fields: CourseStatusHistoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CourseStatusHistory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourseStatusHistoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CourseStatusHistory model
   */
  interface CourseStatusHistoryFieldRefs {
    readonly id: FieldRef<"CourseStatusHistory", 'String'>
    readonly courseId: FieldRef<"CourseStatusHistory", 'String'>
    readonly fromStatus: FieldRef<"CourseStatusHistory", 'RecordStatus'>
    readonly toStatus: FieldRef<"CourseStatusHistory", 'RecordStatus'>
    readonly changedBy: FieldRef<"CourseStatusHistory", 'String'>
    readonly reason: FieldRef<"CourseStatusHistory", 'String'>
    readonly changedAt: FieldRef<"CourseStatusHistory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CourseStatusHistory findUnique
   */
  export type CourseStatusHistoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which CourseStatusHistory to fetch.
     */
    where: CourseStatusHistoryWhereUniqueInput
  }

  /**
   * CourseStatusHistory findUniqueOrThrow
   */
  export type CourseStatusHistoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which CourseStatusHistory to fetch.
     */
    where: CourseStatusHistoryWhereUniqueInput
  }

  /**
   * CourseStatusHistory findFirst
   */
  export type CourseStatusHistoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which CourseStatusHistory to fetch.
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseStatusHistories to fetch.
     */
    orderBy?: CourseStatusHistoryOrderByWithRelationInput | CourseStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourseStatusHistories.
     */
    cursor?: CourseStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseStatusHistories.
     */
    distinct?: CourseStatusHistoryScalarFieldEnum | CourseStatusHistoryScalarFieldEnum[]
  }

  /**
   * CourseStatusHistory findFirstOrThrow
   */
  export type CourseStatusHistoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which CourseStatusHistory to fetch.
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseStatusHistories to fetch.
     */
    orderBy?: CourseStatusHistoryOrderByWithRelationInput | CourseStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CourseStatusHistories.
     */
    cursor?: CourseStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseStatusHistories.
     */
    distinct?: CourseStatusHistoryScalarFieldEnum | CourseStatusHistoryScalarFieldEnum[]
  }

  /**
   * CourseStatusHistory findMany
   */
  export type CourseStatusHistoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which CourseStatusHistories to fetch.
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CourseStatusHistories to fetch.
     */
    orderBy?: CourseStatusHistoryOrderByWithRelationInput | CourseStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CourseStatusHistories.
     */
    cursor?: CourseStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CourseStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CourseStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CourseStatusHistories.
     */
    distinct?: CourseStatusHistoryScalarFieldEnum | CourseStatusHistoryScalarFieldEnum[]
  }

  /**
   * CourseStatusHistory create
   */
  export type CourseStatusHistoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * The data needed to create a CourseStatusHistory.
     */
    data: XOR<CourseStatusHistoryCreateInput, CourseStatusHistoryUncheckedCreateInput>
  }

  /**
   * CourseStatusHistory createMany
   */
  export type CourseStatusHistoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CourseStatusHistories.
     */
    data: CourseStatusHistoryCreateManyInput | CourseStatusHistoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CourseStatusHistory createManyAndReturn
   */
  export type CourseStatusHistoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * The data used to create many CourseStatusHistories.
     */
    data: CourseStatusHistoryCreateManyInput | CourseStatusHistoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourseStatusHistory update
   */
  export type CourseStatusHistoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * The data needed to update a CourseStatusHistory.
     */
    data: XOR<CourseStatusHistoryUpdateInput, CourseStatusHistoryUncheckedUpdateInput>
    /**
     * Choose, which CourseStatusHistory to update.
     */
    where: CourseStatusHistoryWhereUniqueInput
  }

  /**
   * CourseStatusHistory updateMany
   */
  export type CourseStatusHistoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CourseStatusHistories.
     */
    data: XOR<CourseStatusHistoryUpdateManyMutationInput, CourseStatusHistoryUncheckedUpdateManyInput>
    /**
     * Filter which CourseStatusHistories to update
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * Limit how many CourseStatusHistories to update.
     */
    limit?: number
  }

  /**
   * CourseStatusHistory updateManyAndReturn
   */
  export type CourseStatusHistoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * The data used to update CourseStatusHistories.
     */
    data: XOR<CourseStatusHistoryUpdateManyMutationInput, CourseStatusHistoryUncheckedUpdateManyInput>
    /**
     * Filter which CourseStatusHistories to update
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * Limit how many CourseStatusHistories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CourseStatusHistory upsert
   */
  export type CourseStatusHistoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * The filter to search for the CourseStatusHistory to update in case it exists.
     */
    where: CourseStatusHistoryWhereUniqueInput
    /**
     * In case the CourseStatusHistory found by the `where` argument doesn't exist, create a new CourseStatusHistory with this data.
     */
    create: XOR<CourseStatusHistoryCreateInput, CourseStatusHistoryUncheckedCreateInput>
    /**
     * In case the CourseStatusHistory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourseStatusHistoryUpdateInput, CourseStatusHistoryUncheckedUpdateInput>
  }

  /**
   * CourseStatusHistory delete
   */
  export type CourseStatusHistoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter which CourseStatusHistory to delete.
     */
    where: CourseStatusHistoryWhereUniqueInput
  }

  /**
   * CourseStatusHistory deleteMany
   */
  export type CourseStatusHistoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CourseStatusHistories to delete
     */
    where?: CourseStatusHistoryWhereInput
    /**
     * Limit how many CourseStatusHistories to delete.
     */
    limit?: number
  }

  /**
   * CourseStatusHistory without action
   */
  export type CourseStatusHistoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseStatusHistory
     */
    select?: CourseStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CourseStatusHistory
     */
    omit?: CourseStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseStatusHistoryInclude<ExtArgs> | null
  }


  /**
   * Model BatchStatusHistory
   */

  export type AggregateBatchStatusHistory = {
    _count: BatchStatusHistoryCountAggregateOutputType | null
    _min: BatchStatusHistoryMinAggregateOutputType | null
    _max: BatchStatusHistoryMaxAggregateOutputType | null
  }

  export type BatchStatusHistoryMinAggregateOutputType = {
    id: string | null
    batchId: string | null
    fromStatus: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus | null
    changedBy: string | null
    reason: string | null
    changedAt: Date | null
  }

  export type BatchStatusHistoryMaxAggregateOutputType = {
    id: string | null
    batchId: string | null
    fromStatus: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus | null
    changedBy: string | null
    reason: string | null
    changedAt: Date | null
  }

  export type BatchStatusHistoryCountAggregateOutputType = {
    id: number
    batchId: number
    fromStatus: number
    toStatus: number
    changedBy: number
    reason: number
    changedAt: number
    _all: number
  }


  export type BatchStatusHistoryMinAggregateInputType = {
    id?: true
    batchId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
  }

  export type BatchStatusHistoryMaxAggregateInputType = {
    id?: true
    batchId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
  }

  export type BatchStatusHistoryCountAggregateInputType = {
    id?: true
    batchId?: true
    fromStatus?: true
    toStatus?: true
    changedBy?: true
    reason?: true
    changedAt?: true
    _all?: true
  }

  export type BatchStatusHistoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BatchStatusHistory to aggregate.
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchStatusHistories to fetch.
     */
    orderBy?: BatchStatusHistoryOrderByWithRelationInput | BatchStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BatchStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BatchStatusHistories
    **/
    _count?: true | BatchStatusHistoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BatchStatusHistoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BatchStatusHistoryMaxAggregateInputType
  }

  export type GetBatchStatusHistoryAggregateType<T extends BatchStatusHistoryAggregateArgs> = {
        [P in keyof T & keyof AggregateBatchStatusHistory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBatchStatusHistory[P]>
      : GetScalarType<T[P], AggregateBatchStatusHistory[P]>
  }




  export type BatchStatusHistoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BatchStatusHistoryWhereInput
    orderBy?: BatchStatusHistoryOrderByWithAggregationInput | BatchStatusHistoryOrderByWithAggregationInput[]
    by: BatchStatusHistoryScalarFieldEnum[] | BatchStatusHistoryScalarFieldEnum
    having?: BatchStatusHistoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BatchStatusHistoryCountAggregateInputType | true
    _min?: BatchStatusHistoryMinAggregateInputType
    _max?: BatchStatusHistoryMaxAggregateInputType
  }

  export type BatchStatusHistoryGroupByOutputType = {
    id: string
    batchId: string
    fromStatus: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy: string | null
    reason: string | null
    changedAt: Date
    _count: BatchStatusHistoryCountAggregateOutputType | null
    _min: BatchStatusHistoryMinAggregateOutputType | null
    _max: BatchStatusHistoryMaxAggregateOutputType | null
  }

  type GetBatchStatusHistoryGroupByPayload<T extends BatchStatusHistoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BatchStatusHistoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BatchStatusHistoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BatchStatusHistoryGroupByOutputType[P]>
            : GetScalarType<T[P], BatchStatusHistoryGroupByOutputType[P]>
        }
      >
    >


  export type BatchStatusHistorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchStatusHistory"]>

  export type BatchStatusHistorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchStatusHistory"]>

  export type BatchStatusHistorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    batchId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["batchStatusHistory"]>

  export type BatchStatusHistorySelectScalar = {
    id?: boolean
    batchId?: boolean
    fromStatus?: boolean
    toStatus?: boolean
    changedBy?: boolean
    reason?: boolean
    changedAt?: boolean
  }

  export type BatchStatusHistoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "batchId" | "fromStatus" | "toStatus" | "changedBy" | "reason" | "changedAt", ExtArgs["result"]["batchStatusHistory"]>
  export type BatchStatusHistoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }
  export type BatchStatusHistoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }
  export type BatchStatusHistoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    batch?: boolean | BatchDefaultArgs<ExtArgs>
  }

  export type $BatchStatusHistoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BatchStatusHistory"
    objects: {
      batch: Prisma.$BatchPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      batchId: string
      fromStatus: $Enums.BatchStatus | null
      toStatus: $Enums.BatchStatus
      changedBy: string | null
      reason: string | null
      changedAt: Date
    }, ExtArgs["result"]["batchStatusHistory"]>
    composites: {}
  }

  type BatchStatusHistoryGetPayload<S extends boolean | null | undefined | BatchStatusHistoryDefaultArgs> = $Result.GetResult<Prisma.$BatchStatusHistoryPayload, S>

  type BatchStatusHistoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BatchStatusHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BatchStatusHistoryCountAggregateInputType | true
    }

  export interface BatchStatusHistoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BatchStatusHistory'], meta: { name: 'BatchStatusHistory' } }
    /**
     * Find zero or one BatchStatusHistory that matches the filter.
     * @param {BatchStatusHistoryFindUniqueArgs} args - Arguments to find a BatchStatusHistory
     * @example
     * // Get one BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BatchStatusHistoryFindUniqueArgs>(args: SelectSubset<T, BatchStatusHistoryFindUniqueArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BatchStatusHistory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BatchStatusHistoryFindUniqueOrThrowArgs} args - Arguments to find a BatchStatusHistory
     * @example
     * // Get one BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BatchStatusHistoryFindUniqueOrThrowArgs>(args: SelectSubset<T, BatchStatusHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BatchStatusHistory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryFindFirstArgs} args - Arguments to find a BatchStatusHistory
     * @example
     * // Get one BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BatchStatusHistoryFindFirstArgs>(args?: SelectSubset<T, BatchStatusHistoryFindFirstArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BatchStatusHistory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryFindFirstOrThrowArgs} args - Arguments to find a BatchStatusHistory
     * @example
     * // Get one BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BatchStatusHistoryFindFirstOrThrowArgs>(args?: SelectSubset<T, BatchStatusHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BatchStatusHistories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BatchStatusHistories
     * const batchStatusHistories = await prisma.batchStatusHistory.findMany()
     * 
     * // Get first 10 BatchStatusHistories
     * const batchStatusHistories = await prisma.batchStatusHistory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const batchStatusHistoryWithIdOnly = await prisma.batchStatusHistory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BatchStatusHistoryFindManyArgs>(args?: SelectSubset<T, BatchStatusHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BatchStatusHistory.
     * @param {BatchStatusHistoryCreateArgs} args - Arguments to create a BatchStatusHistory.
     * @example
     * // Create one BatchStatusHistory
     * const BatchStatusHistory = await prisma.batchStatusHistory.create({
     *   data: {
     *     // ... data to create a BatchStatusHistory
     *   }
     * })
     * 
     */
    create<T extends BatchStatusHistoryCreateArgs>(args: SelectSubset<T, BatchStatusHistoryCreateArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BatchStatusHistories.
     * @param {BatchStatusHistoryCreateManyArgs} args - Arguments to create many BatchStatusHistories.
     * @example
     * // Create many BatchStatusHistories
     * const batchStatusHistory = await prisma.batchStatusHistory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BatchStatusHistoryCreateManyArgs>(args?: SelectSubset<T, BatchStatusHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BatchStatusHistories and returns the data saved in the database.
     * @param {BatchStatusHistoryCreateManyAndReturnArgs} args - Arguments to create many BatchStatusHistories.
     * @example
     * // Create many BatchStatusHistories
     * const batchStatusHistory = await prisma.batchStatusHistory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BatchStatusHistories and only return the `id`
     * const batchStatusHistoryWithIdOnly = await prisma.batchStatusHistory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BatchStatusHistoryCreateManyAndReturnArgs>(args?: SelectSubset<T, BatchStatusHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BatchStatusHistory.
     * @param {BatchStatusHistoryDeleteArgs} args - Arguments to delete one BatchStatusHistory.
     * @example
     * // Delete one BatchStatusHistory
     * const BatchStatusHistory = await prisma.batchStatusHistory.delete({
     *   where: {
     *     // ... filter to delete one BatchStatusHistory
     *   }
     * })
     * 
     */
    delete<T extends BatchStatusHistoryDeleteArgs>(args: SelectSubset<T, BatchStatusHistoryDeleteArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BatchStatusHistory.
     * @param {BatchStatusHistoryUpdateArgs} args - Arguments to update one BatchStatusHistory.
     * @example
     * // Update one BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BatchStatusHistoryUpdateArgs>(args: SelectSubset<T, BatchStatusHistoryUpdateArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BatchStatusHistories.
     * @param {BatchStatusHistoryDeleteManyArgs} args - Arguments to filter BatchStatusHistories to delete.
     * @example
     * // Delete a few BatchStatusHistories
     * const { count } = await prisma.batchStatusHistory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BatchStatusHistoryDeleteManyArgs>(args?: SelectSubset<T, BatchStatusHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BatchStatusHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BatchStatusHistories
     * const batchStatusHistory = await prisma.batchStatusHistory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BatchStatusHistoryUpdateManyArgs>(args: SelectSubset<T, BatchStatusHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BatchStatusHistories and returns the data updated in the database.
     * @param {BatchStatusHistoryUpdateManyAndReturnArgs} args - Arguments to update many BatchStatusHistories.
     * @example
     * // Update many BatchStatusHistories
     * const batchStatusHistory = await prisma.batchStatusHistory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BatchStatusHistories and only return the `id`
     * const batchStatusHistoryWithIdOnly = await prisma.batchStatusHistory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BatchStatusHistoryUpdateManyAndReturnArgs>(args: SelectSubset<T, BatchStatusHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BatchStatusHistory.
     * @param {BatchStatusHistoryUpsertArgs} args - Arguments to update or create a BatchStatusHistory.
     * @example
     * // Update or create a BatchStatusHistory
     * const batchStatusHistory = await prisma.batchStatusHistory.upsert({
     *   create: {
     *     // ... data to create a BatchStatusHistory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BatchStatusHistory we want to update
     *   }
     * })
     */
    upsert<T extends BatchStatusHistoryUpsertArgs>(args: SelectSubset<T, BatchStatusHistoryUpsertArgs<ExtArgs>>): Prisma__BatchStatusHistoryClient<$Result.GetResult<Prisma.$BatchStatusHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BatchStatusHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryCountArgs} args - Arguments to filter BatchStatusHistories to count.
     * @example
     * // Count the number of BatchStatusHistories
     * const count = await prisma.batchStatusHistory.count({
     *   where: {
     *     // ... the filter for the BatchStatusHistories we want to count
     *   }
     * })
    **/
    count<T extends BatchStatusHistoryCountArgs>(
      args?: Subset<T, BatchStatusHistoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BatchStatusHistoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BatchStatusHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BatchStatusHistoryAggregateArgs>(args: Subset<T, BatchStatusHistoryAggregateArgs>): Prisma.PrismaPromise<GetBatchStatusHistoryAggregateType<T>>

    /**
     * Group by BatchStatusHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BatchStatusHistoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BatchStatusHistoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BatchStatusHistoryGroupByArgs['orderBy'] }
        : { orderBy?: BatchStatusHistoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BatchStatusHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBatchStatusHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BatchStatusHistory model
   */
  readonly fields: BatchStatusHistoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BatchStatusHistory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BatchStatusHistoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    batch<T extends BatchDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BatchDefaultArgs<ExtArgs>>): Prisma__BatchClient<$Result.GetResult<Prisma.$BatchPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BatchStatusHistory model
   */
  interface BatchStatusHistoryFieldRefs {
    readonly id: FieldRef<"BatchStatusHistory", 'String'>
    readonly batchId: FieldRef<"BatchStatusHistory", 'String'>
    readonly fromStatus: FieldRef<"BatchStatusHistory", 'BatchStatus'>
    readonly toStatus: FieldRef<"BatchStatusHistory", 'BatchStatus'>
    readonly changedBy: FieldRef<"BatchStatusHistory", 'String'>
    readonly reason: FieldRef<"BatchStatusHistory", 'String'>
    readonly changedAt: FieldRef<"BatchStatusHistory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BatchStatusHistory findUnique
   */
  export type BatchStatusHistoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which BatchStatusHistory to fetch.
     */
    where: BatchStatusHistoryWhereUniqueInput
  }

  /**
   * BatchStatusHistory findUniqueOrThrow
   */
  export type BatchStatusHistoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which BatchStatusHistory to fetch.
     */
    where: BatchStatusHistoryWhereUniqueInput
  }

  /**
   * BatchStatusHistory findFirst
   */
  export type BatchStatusHistoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which BatchStatusHistory to fetch.
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchStatusHistories to fetch.
     */
    orderBy?: BatchStatusHistoryOrderByWithRelationInput | BatchStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BatchStatusHistories.
     */
    cursor?: BatchStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchStatusHistories.
     */
    distinct?: BatchStatusHistoryScalarFieldEnum | BatchStatusHistoryScalarFieldEnum[]
  }

  /**
   * BatchStatusHistory findFirstOrThrow
   */
  export type BatchStatusHistoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which BatchStatusHistory to fetch.
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchStatusHistories to fetch.
     */
    orderBy?: BatchStatusHistoryOrderByWithRelationInput | BatchStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BatchStatusHistories.
     */
    cursor?: BatchStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchStatusHistories.
     */
    distinct?: BatchStatusHistoryScalarFieldEnum | BatchStatusHistoryScalarFieldEnum[]
  }

  /**
   * BatchStatusHistory findMany
   */
  export type BatchStatusHistoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter, which BatchStatusHistories to fetch.
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BatchStatusHistories to fetch.
     */
    orderBy?: BatchStatusHistoryOrderByWithRelationInput | BatchStatusHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BatchStatusHistories.
     */
    cursor?: BatchStatusHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BatchStatusHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BatchStatusHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BatchStatusHistories.
     */
    distinct?: BatchStatusHistoryScalarFieldEnum | BatchStatusHistoryScalarFieldEnum[]
  }

  /**
   * BatchStatusHistory create
   */
  export type BatchStatusHistoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * The data needed to create a BatchStatusHistory.
     */
    data: XOR<BatchStatusHistoryCreateInput, BatchStatusHistoryUncheckedCreateInput>
  }

  /**
   * BatchStatusHistory createMany
   */
  export type BatchStatusHistoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BatchStatusHistories.
     */
    data: BatchStatusHistoryCreateManyInput | BatchStatusHistoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BatchStatusHistory createManyAndReturn
   */
  export type BatchStatusHistoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * The data used to create many BatchStatusHistories.
     */
    data: BatchStatusHistoryCreateManyInput | BatchStatusHistoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BatchStatusHistory update
   */
  export type BatchStatusHistoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * The data needed to update a BatchStatusHistory.
     */
    data: XOR<BatchStatusHistoryUpdateInput, BatchStatusHistoryUncheckedUpdateInput>
    /**
     * Choose, which BatchStatusHistory to update.
     */
    where: BatchStatusHistoryWhereUniqueInput
  }

  /**
   * BatchStatusHistory updateMany
   */
  export type BatchStatusHistoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BatchStatusHistories.
     */
    data: XOR<BatchStatusHistoryUpdateManyMutationInput, BatchStatusHistoryUncheckedUpdateManyInput>
    /**
     * Filter which BatchStatusHistories to update
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * Limit how many BatchStatusHistories to update.
     */
    limit?: number
  }

  /**
   * BatchStatusHistory updateManyAndReturn
   */
  export type BatchStatusHistoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * The data used to update BatchStatusHistories.
     */
    data: XOR<BatchStatusHistoryUpdateManyMutationInput, BatchStatusHistoryUncheckedUpdateManyInput>
    /**
     * Filter which BatchStatusHistories to update
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * Limit how many BatchStatusHistories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BatchStatusHistory upsert
   */
  export type BatchStatusHistoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * The filter to search for the BatchStatusHistory to update in case it exists.
     */
    where: BatchStatusHistoryWhereUniqueInput
    /**
     * In case the BatchStatusHistory found by the `where` argument doesn't exist, create a new BatchStatusHistory with this data.
     */
    create: XOR<BatchStatusHistoryCreateInput, BatchStatusHistoryUncheckedCreateInput>
    /**
     * In case the BatchStatusHistory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BatchStatusHistoryUpdateInput, BatchStatusHistoryUncheckedUpdateInput>
  }

  /**
   * BatchStatusHistory delete
   */
  export type BatchStatusHistoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
    /**
     * Filter which BatchStatusHistory to delete.
     */
    where: BatchStatusHistoryWhereUniqueInput
  }

  /**
   * BatchStatusHistory deleteMany
   */
  export type BatchStatusHistoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BatchStatusHistories to delete
     */
    where?: BatchStatusHistoryWhereInput
    /**
     * Limit how many BatchStatusHistories to delete.
     */
    limit?: number
  }

  /**
   * BatchStatusHistory without action
   */
  export type BatchStatusHistoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BatchStatusHistory
     */
    select?: BatchStatusHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the BatchStatusHistory
     */
    omit?: BatchStatusHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BatchStatusHistoryInclude<ExtArgs> | null
  }


  /**
   * Model StudentProfile
   */

  export type AggregateStudentProfile = {
    _count: StudentProfileCountAggregateOutputType | null
    _avg: StudentProfileAvgAggregateOutputType | null
    _sum: StudentProfileSumAggregateOutputType | null
    _min: StudentProfileMinAggregateOutputType | null
    _max: StudentProfileMaxAggregateOutputType | null
  }

  export type StudentProfileAvgAggregateOutputType = {
    passedOutYear: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    totalAmount: number | null
    firstInstallmentAmount: number | null
    secondInstallmentAmount: number | null
  }

  export type StudentProfileSumAggregateOutputType = {
    passedOutYear: number | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    totalAmount: number | null
    firstInstallmentAmount: number | null
    secondInstallmentAmount: number | null
  }

  export type StudentProfileMinAggregateOutputType = {
    id: string | null
    studentCode: string | null
    studentName: string | null
    mobileNumber: string | null
    emailAddress: string | null
    parentSpouseNumber: string | null
    location: string | null
    courseId: string | null
    courseInterested: string | null
    facultyName: string | null
    batchName: string | null
    qualification: string | null
    passedOutYear: number | null
    currentStatus: string | null
    designation: string | null
    source: string | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    totalAmount: number | null
    admissionDate: string | null
    firstInstallmentAmount: number | null
    firstInstallmentDate: string | null
    firstInstallmentStatus: string | null
    firstInstallmentPaidAt: string | null
    secondInstallmentAmount: number | null
    secondDueDate: string | null
    secondInstallmentStatus: string | null
    secondInstallmentPaidAt: string | null
    remarks: string | null
    recordStatus: $Enums.RecordStatus | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudentProfileMaxAggregateOutputType = {
    id: string | null
    studentCode: string | null
    studentName: string | null
    mobileNumber: string | null
    emailAddress: string | null
    parentSpouseNumber: string | null
    location: string | null
    courseId: string | null
    courseInterested: string | null
    facultyName: string | null
    batchName: string | null
    qualification: string | null
    passedOutYear: number | null
    currentStatus: string | null
    designation: string | null
    source: string | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    totalAmount: number | null
    admissionDate: string | null
    firstInstallmentAmount: number | null
    firstInstallmentDate: string | null
    firstInstallmentStatus: string | null
    firstInstallmentPaidAt: string | null
    secondInstallmentAmount: number | null
    secondDueDate: string | null
    secondInstallmentStatus: string | null
    secondInstallmentPaidAt: string | null
    remarks: string | null
    recordStatus: $Enums.RecordStatus | null
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type StudentProfileCountAggregateOutputType = {
    id: number
    studentCode: number
    studentName: number
    mobileNumber: number
    emailAddress: number
    parentSpouseNumber: number
    location: number
    courseId: number
    courseInterested: number
    facultyName: number
    batchName: number
    qualification: number
    passedOutYear: number
    currentStatus: number
    designation: number
    source: number
    actualFees: number
    registrationFees: number
    discount: number
    afterDiscount: number
    installment1: number
    installment2: number
    installment3: number
    totalAmount: number
    admissionDate: number
    firstInstallmentAmount: number
    firstInstallmentDate: number
    firstInstallmentStatus: number
    firstInstallmentPaidAt: number
    secondInstallmentAmount: number
    secondDueDate: number
    secondInstallmentStatus: number
    secondInstallmentPaidAt: number
    remarks: number
    recordStatus: number
    createdBy: number
    updatedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type StudentProfileAvgAggregateInputType = {
    passedOutYear?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    totalAmount?: true
    firstInstallmentAmount?: true
    secondInstallmentAmount?: true
  }

  export type StudentProfileSumAggregateInputType = {
    passedOutYear?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    totalAmount?: true
    firstInstallmentAmount?: true
    secondInstallmentAmount?: true
  }

  export type StudentProfileMinAggregateInputType = {
    id?: true
    studentCode?: true
    studentName?: true
    mobileNumber?: true
    emailAddress?: true
    parentSpouseNumber?: true
    location?: true
    courseId?: true
    courseInterested?: true
    facultyName?: true
    batchName?: true
    qualification?: true
    passedOutYear?: true
    currentStatus?: true
    designation?: true
    source?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    totalAmount?: true
    admissionDate?: true
    firstInstallmentAmount?: true
    firstInstallmentDate?: true
    firstInstallmentStatus?: true
    firstInstallmentPaidAt?: true
    secondInstallmentAmount?: true
    secondDueDate?: true
    secondInstallmentStatus?: true
    secondInstallmentPaidAt?: true
    remarks?: true
    recordStatus?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudentProfileMaxAggregateInputType = {
    id?: true
    studentCode?: true
    studentName?: true
    mobileNumber?: true
    emailAddress?: true
    parentSpouseNumber?: true
    location?: true
    courseId?: true
    courseInterested?: true
    facultyName?: true
    batchName?: true
    qualification?: true
    passedOutYear?: true
    currentStatus?: true
    designation?: true
    source?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    totalAmount?: true
    admissionDate?: true
    firstInstallmentAmount?: true
    firstInstallmentDate?: true
    firstInstallmentStatus?: true
    firstInstallmentPaidAt?: true
    secondInstallmentAmount?: true
    secondDueDate?: true
    secondInstallmentStatus?: true
    secondInstallmentPaidAt?: true
    remarks?: true
    recordStatus?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type StudentProfileCountAggregateInputType = {
    id?: true
    studentCode?: true
    studentName?: true
    mobileNumber?: true
    emailAddress?: true
    parentSpouseNumber?: true
    location?: true
    courseId?: true
    courseInterested?: true
    facultyName?: true
    batchName?: true
    qualification?: true
    passedOutYear?: true
    currentStatus?: true
    designation?: true
    source?: true
    actualFees?: true
    registrationFees?: true
    discount?: true
    afterDiscount?: true
    installment1?: true
    installment2?: true
    installment3?: true
    totalAmount?: true
    admissionDate?: true
    firstInstallmentAmount?: true
    firstInstallmentDate?: true
    firstInstallmentStatus?: true
    firstInstallmentPaidAt?: true
    secondInstallmentAmount?: true
    secondDueDate?: true
    secondInstallmentStatus?: true
    secondInstallmentPaidAt?: true
    remarks?: true
    recordStatus?: true
    createdBy?: true
    updatedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type StudentProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StudentProfile to aggregate.
     */
    where?: StudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudentProfiles to fetch.
     */
    orderBy?: StudentProfileOrderByWithRelationInput | StudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: StudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned StudentProfiles
    **/
    _count?: true | StudentProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: StudentProfileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: StudentProfileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: StudentProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: StudentProfileMaxAggregateInputType
  }

  export type GetStudentProfileAggregateType<T extends StudentProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateStudentProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateStudentProfile[P]>
      : GetScalarType<T[P], AggregateStudentProfile[P]>
  }




  export type StudentProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: StudentProfileWhereInput
    orderBy?: StudentProfileOrderByWithAggregationInput | StudentProfileOrderByWithAggregationInput[]
    by: StudentProfileScalarFieldEnum[] | StudentProfileScalarFieldEnum
    having?: StudentProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: StudentProfileCountAggregateInputType | true
    _avg?: StudentProfileAvgAggregateInputType
    _sum?: StudentProfileSumAggregateInputType
    _min?: StudentProfileMinAggregateInputType
    _max?: StudentProfileMaxAggregateInputType
  }

  export type StudentProfileGroupByOutputType = {
    id: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber: string | null
    location: string | null
    courseId: string | null
    courseInterested: string
    facultyName: string | null
    batchName: string | null
    qualification: string | null
    passedOutYear: number | null
    currentStatus: string | null
    designation: string | null
    source: string | null
    actualFees: number | null
    registrationFees: number | null
    discount: number | null
    afterDiscount: number | null
    installment1: number | null
    installment2: number | null
    installment3: number | null
    totalAmount: number | null
    admissionDate: string
    firstInstallmentAmount: number | null
    firstInstallmentDate: string | null
    firstInstallmentStatus: string
    firstInstallmentPaidAt: string | null
    secondInstallmentAmount: number | null
    secondDueDate: string | null
    secondInstallmentStatus: string
    secondInstallmentPaidAt: string | null
    remarks: string | null
    recordStatus: $Enums.RecordStatus
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: StudentProfileCountAggregateOutputType | null
    _avg: StudentProfileAvgAggregateOutputType | null
    _sum: StudentProfileSumAggregateOutputType | null
    _min: StudentProfileMinAggregateOutputType | null
    _max: StudentProfileMaxAggregateOutputType | null
  }

  type GetStudentProfileGroupByPayload<T extends StudentProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<StudentProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof StudentProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], StudentProfileGroupByOutputType[P]>
            : GetScalarType<T[P], StudentProfileGroupByOutputType[P]>
        }
      >
    >


  export type StudentProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentCode?: boolean
    studentName?: boolean
    mobileNumber?: boolean
    emailAddress?: boolean
    parentSpouseNumber?: boolean
    location?: boolean
    courseId?: boolean
    courseInterested?: boolean
    facultyName?: boolean
    batchName?: boolean
    qualification?: boolean
    passedOutYear?: boolean
    currentStatus?: boolean
    designation?: boolean
    source?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    totalAmount?: boolean
    admissionDate?: boolean
    firstInstallmentAmount?: boolean
    firstInstallmentDate?: boolean
    firstInstallmentStatus?: boolean
    firstInstallmentPaidAt?: boolean
    secondInstallmentAmount?: boolean
    secondDueDate?: boolean
    secondInstallmentStatus?: boolean
    secondInstallmentPaidAt?: boolean
    remarks?: boolean
    recordStatus?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }, ExtArgs["result"]["studentProfile"]>

  export type StudentProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentCode?: boolean
    studentName?: boolean
    mobileNumber?: boolean
    emailAddress?: boolean
    parentSpouseNumber?: boolean
    location?: boolean
    courseId?: boolean
    courseInterested?: boolean
    facultyName?: boolean
    batchName?: boolean
    qualification?: boolean
    passedOutYear?: boolean
    currentStatus?: boolean
    designation?: boolean
    source?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    totalAmount?: boolean
    admissionDate?: boolean
    firstInstallmentAmount?: boolean
    firstInstallmentDate?: boolean
    firstInstallmentStatus?: boolean
    firstInstallmentPaidAt?: boolean
    secondInstallmentAmount?: boolean
    secondDueDate?: boolean
    secondInstallmentStatus?: boolean
    secondInstallmentPaidAt?: boolean
    remarks?: boolean
    recordStatus?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }, ExtArgs["result"]["studentProfile"]>

  export type StudentProfileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    studentCode?: boolean
    studentName?: boolean
    mobileNumber?: boolean
    emailAddress?: boolean
    parentSpouseNumber?: boolean
    location?: boolean
    courseId?: boolean
    courseInterested?: boolean
    facultyName?: boolean
    batchName?: boolean
    qualification?: boolean
    passedOutYear?: boolean
    currentStatus?: boolean
    designation?: boolean
    source?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    totalAmount?: boolean
    admissionDate?: boolean
    firstInstallmentAmount?: boolean
    firstInstallmentDate?: boolean
    firstInstallmentStatus?: boolean
    firstInstallmentPaidAt?: boolean
    secondInstallmentAmount?: boolean
    secondDueDate?: boolean
    secondInstallmentStatus?: boolean
    secondInstallmentPaidAt?: boolean
    remarks?: boolean
    recordStatus?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }, ExtArgs["result"]["studentProfile"]>

  export type StudentProfileSelectScalar = {
    id?: boolean
    studentCode?: boolean
    studentName?: boolean
    mobileNumber?: boolean
    emailAddress?: boolean
    parentSpouseNumber?: boolean
    location?: boolean
    courseId?: boolean
    courseInterested?: boolean
    facultyName?: boolean
    batchName?: boolean
    qualification?: boolean
    passedOutYear?: boolean
    currentStatus?: boolean
    designation?: boolean
    source?: boolean
    actualFees?: boolean
    registrationFees?: boolean
    discount?: boolean
    afterDiscount?: boolean
    installment1?: boolean
    installment2?: boolean
    installment3?: boolean
    totalAmount?: boolean
    admissionDate?: boolean
    firstInstallmentAmount?: boolean
    firstInstallmentDate?: boolean
    firstInstallmentStatus?: boolean
    firstInstallmentPaidAt?: boolean
    secondInstallmentAmount?: boolean
    secondDueDate?: boolean
    secondInstallmentStatus?: boolean
    secondInstallmentPaidAt?: boolean
    remarks?: boolean
    recordStatus?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type StudentProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "studentCode" | "studentName" | "mobileNumber" | "emailAddress" | "parentSpouseNumber" | "location" | "courseId" | "courseInterested" | "facultyName" | "batchName" | "qualification" | "passedOutYear" | "currentStatus" | "designation" | "source" | "actualFees" | "registrationFees" | "discount" | "afterDiscount" | "installment1" | "installment2" | "installment3" | "totalAmount" | "admissionDate" | "firstInstallmentAmount" | "firstInstallmentDate" | "firstInstallmentStatus" | "firstInstallmentPaidAt" | "secondInstallmentAmount" | "secondDueDate" | "secondInstallmentStatus" | "secondInstallmentPaidAt" | "remarks" | "recordStatus" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["studentProfile"]>
  export type StudentProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }
  export type StudentProfileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }
  export type StudentProfileIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    course?: boolean | StudentProfile$courseArgs<ExtArgs>
  }

  export type $StudentProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "StudentProfile"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      studentCode: string
      studentName: string
      mobileNumber: string
      emailAddress: string
      parentSpouseNumber: string | null
      location: string | null
      courseId: string | null
      courseInterested: string
      facultyName: string | null
      batchName: string | null
      qualification: string | null
      passedOutYear: number | null
      currentStatus: string | null
      designation: string | null
      source: string | null
      actualFees: number | null
      registrationFees: number | null
      discount: number | null
      afterDiscount: number | null
      installment1: number | null
      installment2: number | null
      installment3: number | null
      totalAmount: number | null
      admissionDate: string
      firstInstallmentAmount: number | null
      firstInstallmentDate: string | null
      firstInstallmentStatus: string
      firstInstallmentPaidAt: string | null
      secondInstallmentAmount: number | null
      secondDueDate: string | null
      secondInstallmentStatus: string
      secondInstallmentPaidAt: string | null
      remarks: string | null
      recordStatus: $Enums.RecordStatus
      createdBy: string | null
      updatedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["studentProfile"]>
    composites: {}
  }

  type StudentProfileGetPayload<S extends boolean | null | undefined | StudentProfileDefaultArgs> = $Result.GetResult<Prisma.$StudentProfilePayload, S>

  type StudentProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<StudentProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: StudentProfileCountAggregateInputType | true
    }

  export interface StudentProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['StudentProfile'], meta: { name: 'StudentProfile' } }
    /**
     * Find zero or one StudentProfile that matches the filter.
     * @param {StudentProfileFindUniqueArgs} args - Arguments to find a StudentProfile
     * @example
     * // Get one StudentProfile
     * const studentProfile = await prisma.studentProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends StudentProfileFindUniqueArgs>(args: SelectSubset<T, StudentProfileFindUniqueArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one StudentProfile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {StudentProfileFindUniqueOrThrowArgs} args - Arguments to find a StudentProfile
     * @example
     * // Get one StudentProfile
     * const studentProfile = await prisma.studentProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends StudentProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, StudentProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StudentProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileFindFirstArgs} args - Arguments to find a StudentProfile
     * @example
     * // Get one StudentProfile
     * const studentProfile = await prisma.studentProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends StudentProfileFindFirstArgs>(args?: SelectSubset<T, StudentProfileFindFirstArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first StudentProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileFindFirstOrThrowArgs} args - Arguments to find a StudentProfile
     * @example
     * // Get one StudentProfile
     * const studentProfile = await prisma.studentProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends StudentProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, StudentProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more StudentProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all StudentProfiles
     * const studentProfiles = await prisma.studentProfile.findMany()
     * 
     * // Get first 10 StudentProfiles
     * const studentProfiles = await prisma.studentProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const studentProfileWithIdOnly = await prisma.studentProfile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends StudentProfileFindManyArgs>(args?: SelectSubset<T, StudentProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a StudentProfile.
     * @param {StudentProfileCreateArgs} args - Arguments to create a StudentProfile.
     * @example
     * // Create one StudentProfile
     * const StudentProfile = await prisma.studentProfile.create({
     *   data: {
     *     // ... data to create a StudentProfile
     *   }
     * })
     * 
     */
    create<T extends StudentProfileCreateArgs>(args: SelectSubset<T, StudentProfileCreateArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many StudentProfiles.
     * @param {StudentProfileCreateManyArgs} args - Arguments to create many StudentProfiles.
     * @example
     * // Create many StudentProfiles
     * const studentProfile = await prisma.studentProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends StudentProfileCreateManyArgs>(args?: SelectSubset<T, StudentProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many StudentProfiles and returns the data saved in the database.
     * @param {StudentProfileCreateManyAndReturnArgs} args - Arguments to create many StudentProfiles.
     * @example
     * // Create many StudentProfiles
     * const studentProfile = await prisma.studentProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many StudentProfiles and only return the `id`
     * const studentProfileWithIdOnly = await prisma.studentProfile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends StudentProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, StudentProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a StudentProfile.
     * @param {StudentProfileDeleteArgs} args - Arguments to delete one StudentProfile.
     * @example
     * // Delete one StudentProfile
     * const StudentProfile = await prisma.studentProfile.delete({
     *   where: {
     *     // ... filter to delete one StudentProfile
     *   }
     * })
     * 
     */
    delete<T extends StudentProfileDeleteArgs>(args: SelectSubset<T, StudentProfileDeleteArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one StudentProfile.
     * @param {StudentProfileUpdateArgs} args - Arguments to update one StudentProfile.
     * @example
     * // Update one StudentProfile
     * const studentProfile = await prisma.studentProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends StudentProfileUpdateArgs>(args: SelectSubset<T, StudentProfileUpdateArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more StudentProfiles.
     * @param {StudentProfileDeleteManyArgs} args - Arguments to filter StudentProfiles to delete.
     * @example
     * // Delete a few StudentProfiles
     * const { count } = await prisma.studentProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends StudentProfileDeleteManyArgs>(args?: SelectSubset<T, StudentProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StudentProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many StudentProfiles
     * const studentProfile = await prisma.studentProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends StudentProfileUpdateManyArgs>(args: SelectSubset<T, StudentProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more StudentProfiles and returns the data updated in the database.
     * @param {StudentProfileUpdateManyAndReturnArgs} args - Arguments to update many StudentProfiles.
     * @example
     * // Update many StudentProfiles
     * const studentProfile = await prisma.studentProfile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more StudentProfiles and only return the `id`
     * const studentProfileWithIdOnly = await prisma.studentProfile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends StudentProfileUpdateManyAndReturnArgs>(args: SelectSubset<T, StudentProfileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one StudentProfile.
     * @param {StudentProfileUpsertArgs} args - Arguments to update or create a StudentProfile.
     * @example
     * // Update or create a StudentProfile
     * const studentProfile = await prisma.studentProfile.upsert({
     *   create: {
     *     // ... data to create a StudentProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the StudentProfile we want to update
     *   }
     * })
     */
    upsert<T extends StudentProfileUpsertArgs>(args: SelectSubset<T, StudentProfileUpsertArgs<ExtArgs>>): Prisma__StudentProfileClient<$Result.GetResult<Prisma.$StudentProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of StudentProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileCountArgs} args - Arguments to filter StudentProfiles to count.
     * @example
     * // Count the number of StudentProfiles
     * const count = await prisma.studentProfile.count({
     *   where: {
     *     // ... the filter for the StudentProfiles we want to count
     *   }
     * })
    **/
    count<T extends StudentProfileCountArgs>(
      args?: Subset<T, StudentProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], StudentProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a StudentProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends StudentProfileAggregateArgs>(args: Subset<T, StudentProfileAggregateArgs>): Prisma.PrismaPromise<GetStudentProfileAggregateType<T>>

    /**
     * Group by StudentProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {StudentProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends StudentProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: StudentProfileGroupByArgs['orderBy'] }
        : { orderBy?: StudentProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, StudentProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetStudentProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the StudentProfile model
   */
  readonly fields: StudentProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for StudentProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__StudentProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends StudentProfile$courseArgs<ExtArgs> = {}>(args?: Subset<T, StudentProfile$courseArgs<ExtArgs>>): Prisma__CourseClient<$Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the StudentProfile model
   */
  interface StudentProfileFieldRefs {
    readonly id: FieldRef<"StudentProfile", 'String'>
    readonly studentCode: FieldRef<"StudentProfile", 'String'>
    readonly studentName: FieldRef<"StudentProfile", 'String'>
    readonly mobileNumber: FieldRef<"StudentProfile", 'String'>
    readonly emailAddress: FieldRef<"StudentProfile", 'String'>
    readonly parentSpouseNumber: FieldRef<"StudentProfile", 'String'>
    readonly location: FieldRef<"StudentProfile", 'String'>
    readonly courseId: FieldRef<"StudentProfile", 'String'>
    readonly courseInterested: FieldRef<"StudentProfile", 'String'>
    readonly facultyName: FieldRef<"StudentProfile", 'String'>
    readonly batchName: FieldRef<"StudentProfile", 'String'>
    readonly qualification: FieldRef<"StudentProfile", 'String'>
    readonly passedOutYear: FieldRef<"StudentProfile", 'Int'>
    readonly currentStatus: FieldRef<"StudentProfile", 'String'>
    readonly designation: FieldRef<"StudentProfile", 'String'>
    readonly source: FieldRef<"StudentProfile", 'String'>
    readonly actualFees: FieldRef<"StudentProfile", 'Int'>
    readonly registrationFees: FieldRef<"StudentProfile", 'Int'>
    readonly discount: FieldRef<"StudentProfile", 'Int'>
    readonly afterDiscount: FieldRef<"StudentProfile", 'Int'>
    readonly installment1: FieldRef<"StudentProfile", 'Int'>
    readonly installment2: FieldRef<"StudentProfile", 'Int'>
    readonly installment3: FieldRef<"StudentProfile", 'Int'>
    readonly totalAmount: FieldRef<"StudentProfile", 'Int'>
    readonly admissionDate: FieldRef<"StudentProfile", 'String'>
    readonly firstInstallmentAmount: FieldRef<"StudentProfile", 'Int'>
    readonly firstInstallmentDate: FieldRef<"StudentProfile", 'String'>
    readonly firstInstallmentStatus: FieldRef<"StudentProfile", 'String'>
    readonly firstInstallmentPaidAt: FieldRef<"StudentProfile", 'String'>
    readonly secondInstallmentAmount: FieldRef<"StudentProfile", 'Int'>
    readonly secondDueDate: FieldRef<"StudentProfile", 'String'>
    readonly secondInstallmentStatus: FieldRef<"StudentProfile", 'String'>
    readonly secondInstallmentPaidAt: FieldRef<"StudentProfile", 'String'>
    readonly remarks: FieldRef<"StudentProfile", 'String'>
    readonly recordStatus: FieldRef<"StudentProfile", 'RecordStatus'>
    readonly createdBy: FieldRef<"StudentProfile", 'String'>
    readonly updatedBy: FieldRef<"StudentProfile", 'String'>
    readonly createdAt: FieldRef<"StudentProfile", 'DateTime'>
    readonly updatedAt: FieldRef<"StudentProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * StudentProfile findUnique
   */
  export type StudentProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which StudentProfile to fetch.
     */
    where: StudentProfileWhereUniqueInput
  }

  /**
   * StudentProfile findUniqueOrThrow
   */
  export type StudentProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which StudentProfile to fetch.
     */
    where: StudentProfileWhereUniqueInput
  }

  /**
   * StudentProfile findFirst
   */
  export type StudentProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which StudentProfile to fetch.
     */
    where?: StudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudentProfiles to fetch.
     */
    orderBy?: StudentProfileOrderByWithRelationInput | StudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StudentProfiles.
     */
    cursor?: StudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StudentProfiles.
     */
    distinct?: StudentProfileScalarFieldEnum | StudentProfileScalarFieldEnum[]
  }

  /**
   * StudentProfile findFirstOrThrow
   */
  export type StudentProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which StudentProfile to fetch.
     */
    where?: StudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudentProfiles to fetch.
     */
    orderBy?: StudentProfileOrderByWithRelationInput | StudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for StudentProfiles.
     */
    cursor?: StudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StudentProfiles.
     */
    distinct?: StudentProfileScalarFieldEnum | StudentProfileScalarFieldEnum[]
  }

  /**
   * StudentProfile findMany
   */
  export type StudentProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter, which StudentProfiles to fetch.
     */
    where?: StudentProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of StudentProfiles to fetch.
     */
    orderBy?: StudentProfileOrderByWithRelationInput | StudentProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing StudentProfiles.
     */
    cursor?: StudentProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` StudentProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` StudentProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of StudentProfiles.
     */
    distinct?: StudentProfileScalarFieldEnum | StudentProfileScalarFieldEnum[]
  }

  /**
   * StudentProfile create
   */
  export type StudentProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a StudentProfile.
     */
    data: XOR<StudentProfileCreateInput, StudentProfileUncheckedCreateInput>
  }

  /**
   * StudentProfile createMany
   */
  export type StudentProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many StudentProfiles.
     */
    data: StudentProfileCreateManyInput | StudentProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * StudentProfile createManyAndReturn
   */
  export type StudentProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * The data used to create many StudentProfiles.
     */
    data: StudentProfileCreateManyInput | StudentProfileCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * StudentProfile update
   */
  export type StudentProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a StudentProfile.
     */
    data: XOR<StudentProfileUpdateInput, StudentProfileUncheckedUpdateInput>
    /**
     * Choose, which StudentProfile to update.
     */
    where: StudentProfileWhereUniqueInput
  }

  /**
   * StudentProfile updateMany
   */
  export type StudentProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update StudentProfiles.
     */
    data: XOR<StudentProfileUpdateManyMutationInput, StudentProfileUncheckedUpdateManyInput>
    /**
     * Filter which StudentProfiles to update
     */
    where?: StudentProfileWhereInput
    /**
     * Limit how many StudentProfiles to update.
     */
    limit?: number
  }

  /**
   * StudentProfile updateManyAndReturn
   */
  export type StudentProfileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * The data used to update StudentProfiles.
     */
    data: XOR<StudentProfileUpdateManyMutationInput, StudentProfileUncheckedUpdateManyInput>
    /**
     * Filter which StudentProfiles to update
     */
    where?: StudentProfileWhereInput
    /**
     * Limit how many StudentProfiles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * StudentProfile upsert
   */
  export type StudentProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the StudentProfile to update in case it exists.
     */
    where: StudentProfileWhereUniqueInput
    /**
     * In case the StudentProfile found by the `where` argument doesn't exist, create a new StudentProfile with this data.
     */
    create: XOR<StudentProfileCreateInput, StudentProfileUncheckedCreateInput>
    /**
     * In case the StudentProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<StudentProfileUpdateInput, StudentProfileUncheckedUpdateInput>
  }

  /**
   * StudentProfile delete
   */
  export type StudentProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
    /**
     * Filter which StudentProfile to delete.
     */
    where: StudentProfileWhereUniqueInput
  }

  /**
   * StudentProfile deleteMany
   */
  export type StudentProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which StudentProfiles to delete
     */
    where?: StudentProfileWhereInput
    /**
     * Limit how many StudentProfiles to delete.
     */
    limit?: number
  }

  /**
   * StudentProfile.course
   */
  export type StudentProfile$courseArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    where?: CourseWhereInput
  }

  /**
   * StudentProfile without action
   */
  export type StudentProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the StudentProfile
     */
    select?: StudentProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the StudentProfile
     */
    omit?: StudentProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: StudentProfileInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    userCode: 'userCode',
    fullName: 'fullName',
    email: 'email',
    phone: 'phone',
    role: 'role',
    active: 'active',
    passwordHash: 'passwordHash',
    passwordChangedAt: 'passwordChangedAt',
    refreshTokenVersion: 'refreshTokenVersion',
    failedLoginCount: 'failedLoginCount',
    failedLoginWindowExpiresAt: 'failedLoginWindowExpiresAt',
    lockedUntil: 'lockedUntil',
    lastLoginAt: 'lastLoginAt',
    lastLogoutAt: 'lastLogoutAt',
    lastLoginIp: 'lastLoginIp',
    lastLoginUserAgent: 'lastLoginUserAgent',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const LoginEventScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    eventType: 'eventType',
    success: 'success',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    reason: 'reason',
    meta: 'meta',
    createdAt: 'createdAt'
  };

  export type LoginEventScalarFieldEnum = (typeof LoginEventScalarFieldEnum)[keyof typeof LoginEventScalarFieldEnum]


  export const PasswordResetTokenScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    tokenHash: 'tokenHash',
    expiresAt: 'expiresAt',
    usedAt: 'usedAt',
    createdBy: 'createdBy',
    createdAt: 'createdAt'
  };

  export type PasswordResetTokenScalarFieldEnum = (typeof PasswordResetTokenScalarFieldEnum)[keyof typeof PasswordResetTokenScalarFieldEnum]


  export const CourseScalarFieldEnum: {
    id: 'id',
    name: 'name',
    nameKey: 'nameKey',
    description: 'description',
    feeReference: 'feeReference',
    mode: 'mode',
    duration: 'duration',
    hours: 'hours',
    actualFees: 'actualFees',
    registrationFees: 'registrationFees',
    discount: 'discount',
    afterDiscount: 'afterDiscount',
    installmentCount: 'installmentCount',
    installment1: 'installment1',
    installment2: 'installment2',
    installment3: 'installment3',
    status: 'status',
    statusChangedAt: 'statusChangedAt',
    statusChangedBy: 'statusChangedBy',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CourseScalarFieldEnum = (typeof CourseScalarFieldEnum)[keyof typeof CourseScalarFieldEnum]


  export const CourseModuleScalarFieldEnum: {
    id: 'id',
    courseId: 'courseId',
    title: 'title',
    titleKey: 'titleKey',
    description: 'description',
    sequenceNo: 'sequenceNo',
    status: 'status',
    statusChangedAt: 'statusChangedAt',
    statusChangedBy: 'statusChangedBy',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CourseModuleScalarFieldEnum = (typeof CourseModuleScalarFieldEnum)[keyof typeof CourseModuleScalarFieldEnum]


  export const BatchScalarFieldEnum: {
    id: 'id',
    courseId: 'courseId',
    batchName: 'batchName',
    batchNameKey: 'batchNameKey',
    description: 'description',
    startDate: 'startDate',
    endDate: 'endDate',
    startTime: 'startTime',
    endTime: 'endTime',
    capacity: 'capacity',
    enrolledCount: 'enrolledCount',
    status: 'status',
    statusChangedAt: 'statusChangedAt',
    statusChangedBy: 'statusChangedBy',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BatchScalarFieldEnum = (typeof BatchScalarFieldEnum)[keyof typeof BatchScalarFieldEnum]


  export const BatchFacultyAssignmentScalarFieldEnum: {
    id: 'id',
    batchId: 'batchId',
    facultyId: 'facultyId',
    assignedDate: 'assignedDate',
    assignedAt: 'assignedAt',
    releasedAt: 'releasedAt',
    status: 'status',
    notes: 'notes',
    assignedBy: 'assignedBy',
    releasedBy: 'releasedBy',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BatchFacultyAssignmentScalarFieldEnum = (typeof BatchFacultyAssignmentScalarFieldEnum)[keyof typeof BatchFacultyAssignmentScalarFieldEnum]


  export const CourseStatusHistoryScalarFieldEnum: {
    id: 'id',
    courseId: 'courseId',
    fromStatus: 'fromStatus',
    toStatus: 'toStatus',
    changedBy: 'changedBy',
    reason: 'reason',
    changedAt: 'changedAt'
  };

  export type CourseStatusHistoryScalarFieldEnum = (typeof CourseStatusHistoryScalarFieldEnum)[keyof typeof CourseStatusHistoryScalarFieldEnum]


  export const BatchStatusHistoryScalarFieldEnum: {
    id: 'id',
    batchId: 'batchId',
    fromStatus: 'fromStatus',
    toStatus: 'toStatus',
    changedBy: 'changedBy',
    reason: 'reason',
    changedAt: 'changedAt'
  };

  export type BatchStatusHistoryScalarFieldEnum = (typeof BatchStatusHistoryScalarFieldEnum)[keyof typeof BatchStatusHistoryScalarFieldEnum]


  export const StudentProfileScalarFieldEnum: {
    id: 'id',
    studentCode: 'studentCode',
    studentName: 'studentName',
    mobileNumber: 'mobileNumber',
    emailAddress: 'emailAddress',
    parentSpouseNumber: 'parentSpouseNumber',
    location: 'location',
    courseId: 'courseId',
    courseInterested: 'courseInterested',
    facultyName: 'facultyName',
    batchName: 'batchName',
    qualification: 'qualification',
    passedOutYear: 'passedOutYear',
    currentStatus: 'currentStatus',
    designation: 'designation',
    source: 'source',
    actualFees: 'actualFees',
    registrationFees: 'registrationFees',
    discount: 'discount',
    afterDiscount: 'afterDiscount',
    installment1: 'installment1',
    installment2: 'installment2',
    installment3: 'installment3',
    totalAmount: 'totalAmount',
    admissionDate: 'admissionDate',
    firstInstallmentAmount: 'firstInstallmentAmount',
    firstInstallmentDate: 'firstInstallmentDate',
    firstInstallmentStatus: 'firstInstallmentStatus',
    firstInstallmentPaidAt: 'firstInstallmentPaidAt',
    secondInstallmentAmount: 'secondInstallmentAmount',
    secondDueDate: 'secondDueDate',
    secondInstallmentStatus: 'secondInstallmentStatus',
    secondInstallmentPaidAt: 'secondInstallmentPaidAt',
    remarks: 'remarks',
    recordStatus: 'recordStatus',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type StudentProfileScalarFieldEnum = (typeof StudentProfileScalarFieldEnum)[keyof typeof StudentProfileScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'LoginEventType'
   */
  export type EnumLoginEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LoginEventType'>
    


  /**
   * Reference to a field of type 'LoginEventType[]'
   */
  export type ListEnumLoginEventTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LoginEventType[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'RecordStatus'
   */
  export type EnumRecordStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RecordStatus'>
    


  /**
   * Reference to a field of type 'RecordStatus[]'
   */
  export type ListEnumRecordStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RecordStatus[]'>
    


  /**
   * Reference to a field of type 'BatchStatus'
   */
  export type EnumBatchStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BatchStatus'>
    


  /**
   * Reference to a field of type 'BatchStatus[]'
   */
  export type ListEnumBatchStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BatchStatus[]'>
    


  /**
   * Reference to a field of type 'AssignmentStatus'
   */
  export type EnumAssignmentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AssignmentStatus'>
    


  /**
   * Reference to a field of type 'AssignmentStatus[]'
   */
  export type ListEnumAssignmentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AssignmentStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    userCode?: StringFilter<"User"> | string
    fullName?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    phone?: StringNullableFilter<"User"> | string | null
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    active?: BoolFilter<"User"> | boolean
    passwordHash?: StringFilter<"User"> | string
    passwordChangedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    refreshTokenVersion?: IntFilter<"User"> | number
    failedLoginCount?: IntFilter<"User"> | number
    failedLoginWindowExpiresAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lockedUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLogoutAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"User"> | string | null
    lastLoginUserAgent?: StringNullableFilter<"User"> | string | null
    createdBy?: StringNullableFilter<"User"> | string | null
    updatedBy?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    loginEvents?: LoginEventListRelationFilter
    passwordResetTokens?: PasswordResetTokenListRelationFilter
    batchFacultyAssignments?: BatchFacultyAssignmentListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    userCode?: SortOrder
    fullName?: SortOrder
    email?: SortOrder
    phone?: SortOrderInput | SortOrder
    role?: SortOrder
    active?: SortOrder
    passwordHash?: SortOrder
    passwordChangedAt?: SortOrderInput | SortOrder
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
    failedLoginWindowExpiresAt?: SortOrderInput | SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLogoutAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    lastLoginUserAgent?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    loginEvents?: LoginEventOrderByRelationAggregateInput
    passwordResetTokens?: PasswordResetTokenOrderByRelationAggregateInput
    batchFacultyAssignments?: BatchFacultyAssignmentOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userCode?: string
    email?: string
    phone?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    fullName?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    active?: BoolFilter<"User"> | boolean
    passwordHash?: StringFilter<"User"> | string
    passwordChangedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    refreshTokenVersion?: IntFilter<"User"> | number
    failedLoginCount?: IntFilter<"User"> | number
    failedLoginWindowExpiresAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lockedUntil?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLogoutAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"User"> | string | null
    lastLoginUserAgent?: StringNullableFilter<"User"> | string | null
    createdBy?: StringNullableFilter<"User"> | string | null
    updatedBy?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    loginEvents?: LoginEventListRelationFilter
    passwordResetTokens?: PasswordResetTokenListRelationFilter
    batchFacultyAssignments?: BatchFacultyAssignmentListRelationFilter
  }, "id" | "userCode" | "email" | "phone">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    userCode?: SortOrder
    fullName?: SortOrder
    email?: SortOrder
    phone?: SortOrderInput | SortOrder
    role?: SortOrder
    active?: SortOrder
    passwordHash?: SortOrder
    passwordChangedAt?: SortOrderInput | SortOrder
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
    failedLoginWindowExpiresAt?: SortOrderInput | SortOrder
    lockedUntil?: SortOrderInput | SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLogoutAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    lastLoginUserAgent?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    userCode?: StringWithAggregatesFilter<"User"> | string
    fullName?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    active?: BoolWithAggregatesFilter<"User"> | boolean
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    passwordChangedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    refreshTokenVersion?: IntWithAggregatesFilter<"User"> | number
    failedLoginCount?: IntWithAggregatesFilter<"User"> | number
    failedLoginWindowExpiresAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    lockedUntil?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    lastLogoutAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableWithAggregatesFilter<"User"> | string | null
    lastLoginUserAgent?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdBy?: StringNullableWithAggregatesFilter<"User"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type LoginEventWhereInput = {
    AND?: LoginEventWhereInput | LoginEventWhereInput[]
    OR?: LoginEventWhereInput[]
    NOT?: LoginEventWhereInput | LoginEventWhereInput[]
    id?: StringFilter<"LoginEvent"> | string
    userId?: StringNullableFilter<"LoginEvent"> | string | null
    eventType?: EnumLoginEventTypeFilter<"LoginEvent"> | $Enums.LoginEventType
    success?: BoolFilter<"LoginEvent"> | boolean
    ipAddress?: StringNullableFilter<"LoginEvent"> | string | null
    userAgent?: StringNullableFilter<"LoginEvent"> | string | null
    reason?: StringNullableFilter<"LoginEvent"> | string | null
    meta?: JsonNullableFilter<"LoginEvent">
    createdAt?: DateTimeFilter<"LoginEvent"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type LoginEventOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    success?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    meta?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type LoginEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LoginEventWhereInput | LoginEventWhereInput[]
    OR?: LoginEventWhereInput[]
    NOT?: LoginEventWhereInput | LoginEventWhereInput[]
    userId?: StringNullableFilter<"LoginEvent"> | string | null
    eventType?: EnumLoginEventTypeFilter<"LoginEvent"> | $Enums.LoginEventType
    success?: BoolFilter<"LoginEvent"> | boolean
    ipAddress?: StringNullableFilter<"LoginEvent"> | string | null
    userAgent?: StringNullableFilter<"LoginEvent"> | string | null
    reason?: StringNullableFilter<"LoginEvent"> | string | null
    meta?: JsonNullableFilter<"LoginEvent">
    createdAt?: DateTimeFilter<"LoginEvent"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type LoginEventOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    success?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    meta?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: LoginEventCountOrderByAggregateInput
    _max?: LoginEventMaxOrderByAggregateInput
    _min?: LoginEventMinOrderByAggregateInput
  }

  export type LoginEventScalarWhereWithAggregatesInput = {
    AND?: LoginEventScalarWhereWithAggregatesInput | LoginEventScalarWhereWithAggregatesInput[]
    OR?: LoginEventScalarWhereWithAggregatesInput[]
    NOT?: LoginEventScalarWhereWithAggregatesInput | LoginEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LoginEvent"> | string
    userId?: StringNullableWithAggregatesFilter<"LoginEvent"> | string | null
    eventType?: EnumLoginEventTypeWithAggregatesFilter<"LoginEvent"> | $Enums.LoginEventType
    success?: BoolWithAggregatesFilter<"LoginEvent"> | boolean
    ipAddress?: StringNullableWithAggregatesFilter<"LoginEvent"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"LoginEvent"> | string | null
    reason?: StringNullableWithAggregatesFilter<"LoginEvent"> | string | null
    meta?: JsonNullableWithAggregatesFilter<"LoginEvent">
    createdAt?: DateTimeWithAggregatesFilter<"LoginEvent"> | Date | string
  }

  export type PasswordResetTokenWhereInput = {
    AND?: PasswordResetTokenWhereInput | PasswordResetTokenWhereInput[]
    OR?: PasswordResetTokenWhereInput[]
    NOT?: PasswordResetTokenWhereInput | PasswordResetTokenWhereInput[]
    id?: StringFilter<"PasswordResetToken"> | string
    userId?: StringFilter<"PasswordResetToken"> | string
    tokenHash?: StringFilter<"PasswordResetToken"> | string
    expiresAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
    usedAt?: DateTimeNullableFilter<"PasswordResetToken"> | Date | string | null
    createdBy?: StringNullableFilter<"PasswordResetToken"> | string | null
    createdAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type PasswordResetTokenOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    expiresAt?: SortOrder
    usedAt?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type PasswordResetTokenWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    tokenHash?: string
    AND?: PasswordResetTokenWhereInput | PasswordResetTokenWhereInput[]
    OR?: PasswordResetTokenWhereInput[]
    NOT?: PasswordResetTokenWhereInput | PasswordResetTokenWhereInput[]
    userId?: StringFilter<"PasswordResetToken"> | string
    expiresAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
    usedAt?: DateTimeNullableFilter<"PasswordResetToken"> | Date | string | null
    createdBy?: StringNullableFilter<"PasswordResetToken"> | string | null
    createdAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "tokenHash">

  export type PasswordResetTokenOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    expiresAt?: SortOrder
    usedAt?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: PasswordResetTokenCountOrderByAggregateInput
    _max?: PasswordResetTokenMaxOrderByAggregateInput
    _min?: PasswordResetTokenMinOrderByAggregateInput
  }

  export type PasswordResetTokenScalarWhereWithAggregatesInput = {
    AND?: PasswordResetTokenScalarWhereWithAggregatesInput | PasswordResetTokenScalarWhereWithAggregatesInput[]
    OR?: PasswordResetTokenScalarWhereWithAggregatesInput[]
    NOT?: PasswordResetTokenScalarWhereWithAggregatesInput | PasswordResetTokenScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PasswordResetToken"> | string
    userId?: StringWithAggregatesFilter<"PasswordResetToken"> | string
    tokenHash?: StringWithAggregatesFilter<"PasswordResetToken"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"PasswordResetToken"> | Date | string
    usedAt?: DateTimeNullableWithAggregatesFilter<"PasswordResetToken"> | Date | string | null
    createdBy?: StringNullableWithAggregatesFilter<"PasswordResetToken"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PasswordResetToken"> | Date | string
  }

  export type CourseWhereInput = {
    AND?: CourseWhereInput | CourseWhereInput[]
    OR?: CourseWhereInput[]
    NOT?: CourseWhereInput | CourseWhereInput[]
    id?: StringFilter<"Course"> | string
    name?: StringFilter<"Course"> | string
    nameKey?: StringFilter<"Course"> | string
    description?: StringNullableFilter<"Course"> | string | null
    feeReference?: StringNullableFilter<"Course"> | string | null
    mode?: StringFilter<"Course"> | string
    duration?: IntNullableFilter<"Course"> | number | null
    hours?: IntNullableFilter<"Course"> | number | null
    actualFees?: IntNullableFilter<"Course"> | number | null
    registrationFees?: IntNullableFilter<"Course"> | number | null
    discount?: IntNullableFilter<"Course"> | number | null
    afterDiscount?: IntNullableFilter<"Course"> | number | null
    installmentCount?: IntFilter<"Course"> | number
    installment1?: IntNullableFilter<"Course"> | number | null
    installment2?: IntNullableFilter<"Course"> | number | null
    installment3?: IntNullableFilter<"Course"> | number | null
    status?: EnumRecordStatusFilter<"Course"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableFilter<"Course"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"Course"> | string | null
    createdBy?: StringNullableFilter<"Course"> | string | null
    updatedBy?: StringNullableFilter<"Course"> | string | null
    createdAt?: DateTimeFilter<"Course"> | Date | string
    updatedAt?: DateTimeFilter<"Course"> | Date | string
    modules?: CourseModuleListRelationFilter
    batches?: BatchListRelationFilter
    students?: StudentProfileListRelationFilter
    statusHistory?: CourseStatusHistoryListRelationFilter
  }

  export type CourseOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    nameKey?: SortOrder
    description?: SortOrderInput | SortOrder
    feeReference?: SortOrderInput | SortOrder
    mode?: SortOrder
    duration?: SortOrderInput | SortOrder
    hours?: SortOrderInput | SortOrder
    actualFees?: SortOrderInput | SortOrder
    registrationFees?: SortOrderInput | SortOrder
    discount?: SortOrderInput | SortOrder
    afterDiscount?: SortOrderInput | SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrderInput | SortOrder
    installment2?: SortOrderInput | SortOrder
    installment3?: SortOrderInput | SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    modules?: CourseModuleOrderByRelationAggregateInput
    batches?: BatchOrderByRelationAggregateInput
    students?: StudentProfileOrderByRelationAggregateInput
    statusHistory?: CourseStatusHistoryOrderByRelationAggregateInput
  }

  export type CourseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    nameKey?: string
    AND?: CourseWhereInput | CourseWhereInput[]
    OR?: CourseWhereInput[]
    NOT?: CourseWhereInput | CourseWhereInput[]
    name?: StringFilter<"Course"> | string
    description?: StringNullableFilter<"Course"> | string | null
    feeReference?: StringNullableFilter<"Course"> | string | null
    mode?: StringFilter<"Course"> | string
    duration?: IntNullableFilter<"Course"> | number | null
    hours?: IntNullableFilter<"Course"> | number | null
    actualFees?: IntNullableFilter<"Course"> | number | null
    registrationFees?: IntNullableFilter<"Course"> | number | null
    discount?: IntNullableFilter<"Course"> | number | null
    afterDiscount?: IntNullableFilter<"Course"> | number | null
    installmentCount?: IntFilter<"Course"> | number
    installment1?: IntNullableFilter<"Course"> | number | null
    installment2?: IntNullableFilter<"Course"> | number | null
    installment3?: IntNullableFilter<"Course"> | number | null
    status?: EnumRecordStatusFilter<"Course"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableFilter<"Course"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"Course"> | string | null
    createdBy?: StringNullableFilter<"Course"> | string | null
    updatedBy?: StringNullableFilter<"Course"> | string | null
    createdAt?: DateTimeFilter<"Course"> | Date | string
    updatedAt?: DateTimeFilter<"Course"> | Date | string
    modules?: CourseModuleListRelationFilter
    batches?: BatchListRelationFilter
    students?: StudentProfileListRelationFilter
    statusHistory?: CourseStatusHistoryListRelationFilter
  }, "id" | "nameKey">

  export type CourseOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    nameKey?: SortOrder
    description?: SortOrderInput | SortOrder
    feeReference?: SortOrderInput | SortOrder
    mode?: SortOrder
    duration?: SortOrderInput | SortOrder
    hours?: SortOrderInput | SortOrder
    actualFees?: SortOrderInput | SortOrder
    registrationFees?: SortOrderInput | SortOrder
    discount?: SortOrderInput | SortOrder
    afterDiscount?: SortOrderInput | SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrderInput | SortOrder
    installment2?: SortOrderInput | SortOrder
    installment3?: SortOrderInput | SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CourseCountOrderByAggregateInput
    _avg?: CourseAvgOrderByAggregateInput
    _max?: CourseMaxOrderByAggregateInput
    _min?: CourseMinOrderByAggregateInput
    _sum?: CourseSumOrderByAggregateInput
  }

  export type CourseScalarWhereWithAggregatesInput = {
    AND?: CourseScalarWhereWithAggregatesInput | CourseScalarWhereWithAggregatesInput[]
    OR?: CourseScalarWhereWithAggregatesInput[]
    NOT?: CourseScalarWhereWithAggregatesInput | CourseScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Course"> | string
    name?: StringWithAggregatesFilter<"Course"> | string
    nameKey?: StringWithAggregatesFilter<"Course"> | string
    description?: StringNullableWithAggregatesFilter<"Course"> | string | null
    feeReference?: StringNullableWithAggregatesFilter<"Course"> | string | null
    mode?: StringWithAggregatesFilter<"Course"> | string
    duration?: IntNullableWithAggregatesFilter<"Course"> | number | null
    hours?: IntNullableWithAggregatesFilter<"Course"> | number | null
    actualFees?: IntNullableWithAggregatesFilter<"Course"> | number | null
    registrationFees?: IntNullableWithAggregatesFilter<"Course"> | number | null
    discount?: IntNullableWithAggregatesFilter<"Course"> | number | null
    afterDiscount?: IntNullableWithAggregatesFilter<"Course"> | number | null
    installmentCount?: IntWithAggregatesFilter<"Course"> | number
    installment1?: IntNullableWithAggregatesFilter<"Course"> | number | null
    installment2?: IntNullableWithAggregatesFilter<"Course"> | number | null
    installment3?: IntNullableWithAggregatesFilter<"Course"> | number | null
    status?: EnumRecordStatusWithAggregatesFilter<"Course"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableWithAggregatesFilter<"Course"> | Date | string | null
    statusChangedBy?: StringNullableWithAggregatesFilter<"Course"> | string | null
    createdBy?: StringNullableWithAggregatesFilter<"Course"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Course"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Course"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Course"> | Date | string
  }

  export type CourseModuleWhereInput = {
    AND?: CourseModuleWhereInput | CourseModuleWhereInput[]
    OR?: CourseModuleWhereInput[]
    NOT?: CourseModuleWhereInput | CourseModuleWhereInput[]
    id?: StringFilter<"CourseModule"> | string
    courseId?: StringFilter<"CourseModule"> | string
    title?: StringFilter<"CourseModule"> | string
    titleKey?: StringFilter<"CourseModule"> | string
    description?: StringNullableFilter<"CourseModule"> | string | null
    sequenceNo?: IntFilter<"CourseModule"> | number
    status?: EnumRecordStatusFilter<"CourseModule"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableFilter<"CourseModule"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdBy?: StringNullableFilter<"CourseModule"> | string | null
    updatedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdAt?: DateTimeFilter<"CourseModule"> | Date | string
    updatedAt?: DateTimeFilter<"CourseModule"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }

  export type CourseModuleOrderByWithRelationInput = {
    id?: SortOrder
    courseId?: SortOrder
    title?: SortOrder
    titleKey?: SortOrder
    description?: SortOrderInput | SortOrder
    sequenceNo?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    course?: CourseOrderByWithRelationInput
  }

  export type CourseModuleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    courseId_sequenceNo?: CourseModuleCourseIdSequenceNoCompoundUniqueInput
    courseId_titleKey?: CourseModuleCourseIdTitleKeyCompoundUniqueInput
    AND?: CourseModuleWhereInput | CourseModuleWhereInput[]
    OR?: CourseModuleWhereInput[]
    NOT?: CourseModuleWhereInput | CourseModuleWhereInput[]
    courseId?: StringFilter<"CourseModule"> | string
    title?: StringFilter<"CourseModule"> | string
    titleKey?: StringFilter<"CourseModule"> | string
    description?: StringNullableFilter<"CourseModule"> | string | null
    sequenceNo?: IntFilter<"CourseModule"> | number
    status?: EnumRecordStatusFilter<"CourseModule"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableFilter<"CourseModule"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdBy?: StringNullableFilter<"CourseModule"> | string | null
    updatedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdAt?: DateTimeFilter<"CourseModule"> | Date | string
    updatedAt?: DateTimeFilter<"CourseModule"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }, "id" | "courseId_sequenceNo" | "courseId_titleKey">

  export type CourseModuleOrderByWithAggregationInput = {
    id?: SortOrder
    courseId?: SortOrder
    title?: SortOrder
    titleKey?: SortOrder
    description?: SortOrderInput | SortOrder
    sequenceNo?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CourseModuleCountOrderByAggregateInput
    _avg?: CourseModuleAvgOrderByAggregateInput
    _max?: CourseModuleMaxOrderByAggregateInput
    _min?: CourseModuleMinOrderByAggregateInput
    _sum?: CourseModuleSumOrderByAggregateInput
  }

  export type CourseModuleScalarWhereWithAggregatesInput = {
    AND?: CourseModuleScalarWhereWithAggregatesInput | CourseModuleScalarWhereWithAggregatesInput[]
    OR?: CourseModuleScalarWhereWithAggregatesInput[]
    NOT?: CourseModuleScalarWhereWithAggregatesInput | CourseModuleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CourseModule"> | string
    courseId?: StringWithAggregatesFilter<"CourseModule"> | string
    title?: StringWithAggregatesFilter<"CourseModule"> | string
    titleKey?: StringWithAggregatesFilter<"CourseModule"> | string
    description?: StringNullableWithAggregatesFilter<"CourseModule"> | string | null
    sequenceNo?: IntWithAggregatesFilter<"CourseModule"> | number
    status?: EnumRecordStatusWithAggregatesFilter<"CourseModule"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableWithAggregatesFilter<"CourseModule"> | Date | string | null
    statusChangedBy?: StringNullableWithAggregatesFilter<"CourseModule"> | string | null
    createdBy?: StringNullableWithAggregatesFilter<"CourseModule"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"CourseModule"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"CourseModule"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CourseModule"> | Date | string
  }

  export type BatchWhereInput = {
    AND?: BatchWhereInput | BatchWhereInput[]
    OR?: BatchWhereInput[]
    NOT?: BatchWhereInput | BatchWhereInput[]
    id?: StringFilter<"Batch"> | string
    courseId?: StringFilter<"Batch"> | string
    batchName?: StringFilter<"Batch"> | string
    batchNameKey?: StringFilter<"Batch"> | string
    description?: StringNullableFilter<"Batch"> | string | null
    startDate?: StringFilter<"Batch"> | string
    endDate?: StringFilter<"Batch"> | string
    startTime?: StringFilter<"Batch"> | string
    endTime?: StringFilter<"Batch"> | string
    capacity?: IntFilter<"Batch"> | number
    enrolledCount?: IntFilter<"Batch"> | number
    status?: EnumBatchStatusFilter<"Batch"> | $Enums.BatchStatus
    statusChangedAt?: DateTimeNullableFilter<"Batch"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"Batch"> | string | null
    createdBy?: StringNullableFilter<"Batch"> | string | null
    updatedBy?: StringNullableFilter<"Batch"> | string | null
    createdAt?: DateTimeFilter<"Batch"> | Date | string
    updatedAt?: DateTimeFilter<"Batch"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    facultyAssignments?: BatchFacultyAssignmentListRelationFilter
    statusHistory?: BatchStatusHistoryListRelationFilter
  }

  export type BatchOrderByWithRelationInput = {
    id?: SortOrder
    courseId?: SortOrder
    batchName?: SortOrder
    batchNameKey?: SortOrder
    description?: SortOrderInput | SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    capacity?: SortOrder
    enrolledCount?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    course?: CourseOrderByWithRelationInput
    facultyAssignments?: BatchFacultyAssignmentOrderByRelationAggregateInput
    statusHistory?: BatchStatusHistoryOrderByRelationAggregateInput
  }

  export type BatchWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    batchNameKey?: string
    AND?: BatchWhereInput | BatchWhereInput[]
    OR?: BatchWhereInput[]
    NOT?: BatchWhereInput | BatchWhereInput[]
    courseId?: StringFilter<"Batch"> | string
    batchName?: StringFilter<"Batch"> | string
    description?: StringNullableFilter<"Batch"> | string | null
    startDate?: StringFilter<"Batch"> | string
    endDate?: StringFilter<"Batch"> | string
    startTime?: StringFilter<"Batch"> | string
    endTime?: StringFilter<"Batch"> | string
    capacity?: IntFilter<"Batch"> | number
    enrolledCount?: IntFilter<"Batch"> | number
    status?: EnumBatchStatusFilter<"Batch"> | $Enums.BatchStatus
    statusChangedAt?: DateTimeNullableFilter<"Batch"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"Batch"> | string | null
    createdBy?: StringNullableFilter<"Batch"> | string | null
    updatedBy?: StringNullableFilter<"Batch"> | string | null
    createdAt?: DateTimeFilter<"Batch"> | Date | string
    updatedAt?: DateTimeFilter<"Batch"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    facultyAssignments?: BatchFacultyAssignmentListRelationFilter
    statusHistory?: BatchStatusHistoryListRelationFilter
  }, "id" | "batchNameKey">

  export type BatchOrderByWithAggregationInput = {
    id?: SortOrder
    courseId?: SortOrder
    batchName?: SortOrder
    batchNameKey?: SortOrder
    description?: SortOrderInput | SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    capacity?: SortOrder
    enrolledCount?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrderInput | SortOrder
    statusChangedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BatchCountOrderByAggregateInput
    _avg?: BatchAvgOrderByAggregateInput
    _max?: BatchMaxOrderByAggregateInput
    _min?: BatchMinOrderByAggregateInput
    _sum?: BatchSumOrderByAggregateInput
  }

  export type BatchScalarWhereWithAggregatesInput = {
    AND?: BatchScalarWhereWithAggregatesInput | BatchScalarWhereWithAggregatesInput[]
    OR?: BatchScalarWhereWithAggregatesInput[]
    NOT?: BatchScalarWhereWithAggregatesInput | BatchScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Batch"> | string
    courseId?: StringWithAggregatesFilter<"Batch"> | string
    batchName?: StringWithAggregatesFilter<"Batch"> | string
    batchNameKey?: StringWithAggregatesFilter<"Batch"> | string
    description?: StringNullableWithAggregatesFilter<"Batch"> | string | null
    startDate?: StringWithAggregatesFilter<"Batch"> | string
    endDate?: StringWithAggregatesFilter<"Batch"> | string
    startTime?: StringWithAggregatesFilter<"Batch"> | string
    endTime?: StringWithAggregatesFilter<"Batch"> | string
    capacity?: IntWithAggregatesFilter<"Batch"> | number
    enrolledCount?: IntWithAggregatesFilter<"Batch"> | number
    status?: EnumBatchStatusWithAggregatesFilter<"Batch"> | $Enums.BatchStatus
    statusChangedAt?: DateTimeNullableWithAggregatesFilter<"Batch"> | Date | string | null
    statusChangedBy?: StringNullableWithAggregatesFilter<"Batch"> | string | null
    createdBy?: StringNullableWithAggregatesFilter<"Batch"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Batch"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Batch"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Batch"> | Date | string
  }

  export type BatchFacultyAssignmentWhereInput = {
    AND?: BatchFacultyAssignmentWhereInput | BatchFacultyAssignmentWhereInput[]
    OR?: BatchFacultyAssignmentWhereInput[]
    NOT?: BatchFacultyAssignmentWhereInput | BatchFacultyAssignmentWhereInput[]
    id?: StringFilter<"BatchFacultyAssignment"> | string
    batchId?: StringFilter<"BatchFacultyAssignment"> | string
    facultyId?: StringFilter<"BatchFacultyAssignment"> | string
    assignedDate?: StringFilter<"BatchFacultyAssignment"> | string
    assignedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    releasedAt?: DateTimeNullableFilter<"BatchFacultyAssignment"> | Date | string | null
    status?: EnumAssignmentStatusFilter<"BatchFacultyAssignment"> | $Enums.AssignmentStatus
    notes?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    assignedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    releasedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    updatedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    updatedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    batch?: XOR<BatchScalarRelationFilter, BatchWhereInput>
    faculty?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type BatchFacultyAssignmentOrderByWithRelationInput = {
    id?: SortOrder
    batchId?: SortOrder
    facultyId?: SortOrder
    assignedDate?: SortOrder
    assignedAt?: SortOrder
    releasedAt?: SortOrderInput | SortOrder
    status?: SortOrder
    notes?: SortOrderInput | SortOrder
    assignedBy?: SortOrderInput | SortOrder
    releasedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    batch?: BatchOrderByWithRelationInput
    faculty?: UserOrderByWithRelationInput
  }

  export type BatchFacultyAssignmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: BatchFacultyAssignmentWhereInput | BatchFacultyAssignmentWhereInput[]
    OR?: BatchFacultyAssignmentWhereInput[]
    NOT?: BatchFacultyAssignmentWhereInput | BatchFacultyAssignmentWhereInput[]
    batchId?: StringFilter<"BatchFacultyAssignment"> | string
    facultyId?: StringFilter<"BatchFacultyAssignment"> | string
    assignedDate?: StringFilter<"BatchFacultyAssignment"> | string
    assignedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    releasedAt?: DateTimeNullableFilter<"BatchFacultyAssignment"> | Date | string | null
    status?: EnumAssignmentStatusFilter<"BatchFacultyAssignment"> | $Enums.AssignmentStatus
    notes?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    assignedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    releasedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    updatedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    updatedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    batch?: XOR<BatchScalarRelationFilter, BatchWhereInput>
    faculty?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type BatchFacultyAssignmentOrderByWithAggregationInput = {
    id?: SortOrder
    batchId?: SortOrder
    facultyId?: SortOrder
    assignedDate?: SortOrder
    assignedAt?: SortOrder
    releasedAt?: SortOrderInput | SortOrder
    status?: SortOrder
    notes?: SortOrderInput | SortOrder
    assignedBy?: SortOrderInput | SortOrder
    releasedBy?: SortOrderInput | SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BatchFacultyAssignmentCountOrderByAggregateInput
    _max?: BatchFacultyAssignmentMaxOrderByAggregateInput
    _min?: BatchFacultyAssignmentMinOrderByAggregateInput
  }

  export type BatchFacultyAssignmentScalarWhereWithAggregatesInput = {
    AND?: BatchFacultyAssignmentScalarWhereWithAggregatesInput | BatchFacultyAssignmentScalarWhereWithAggregatesInput[]
    OR?: BatchFacultyAssignmentScalarWhereWithAggregatesInput[]
    NOT?: BatchFacultyAssignmentScalarWhereWithAggregatesInput | BatchFacultyAssignmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BatchFacultyAssignment"> | string
    batchId?: StringWithAggregatesFilter<"BatchFacultyAssignment"> | string
    facultyId?: StringWithAggregatesFilter<"BatchFacultyAssignment"> | string
    assignedDate?: StringWithAggregatesFilter<"BatchFacultyAssignment"> | string
    assignedAt?: DateTimeWithAggregatesFilter<"BatchFacultyAssignment"> | Date | string
    releasedAt?: DateTimeNullableWithAggregatesFilter<"BatchFacultyAssignment"> | Date | string | null
    status?: EnumAssignmentStatusWithAggregatesFilter<"BatchFacultyAssignment"> | $Enums.AssignmentStatus
    notes?: StringNullableWithAggregatesFilter<"BatchFacultyAssignment"> | string | null
    assignedBy?: StringNullableWithAggregatesFilter<"BatchFacultyAssignment"> | string | null
    releasedBy?: StringNullableWithAggregatesFilter<"BatchFacultyAssignment"> | string | null
    createdBy?: StringNullableWithAggregatesFilter<"BatchFacultyAssignment"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"BatchFacultyAssignment"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"BatchFacultyAssignment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BatchFacultyAssignment"> | Date | string
  }

  export type CourseStatusHistoryWhereInput = {
    AND?: CourseStatusHistoryWhereInput | CourseStatusHistoryWhereInput[]
    OR?: CourseStatusHistoryWhereInput[]
    NOT?: CourseStatusHistoryWhereInput | CourseStatusHistoryWhereInput[]
    id?: StringFilter<"CourseStatusHistory"> | string
    courseId?: StringFilter<"CourseStatusHistory"> | string
    fromStatus?: EnumRecordStatusNullableFilter<"CourseStatusHistory"> | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFilter<"CourseStatusHistory"> | $Enums.RecordStatus
    changedBy?: StringNullableFilter<"CourseStatusHistory"> | string | null
    reason?: StringNullableFilter<"CourseStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"CourseStatusHistory"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }

  export type CourseStatusHistoryOrderByWithRelationInput = {
    id?: SortOrder
    courseId?: SortOrder
    fromStatus?: SortOrderInput | SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    changedAt?: SortOrder
    course?: CourseOrderByWithRelationInput
  }

  export type CourseStatusHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CourseStatusHistoryWhereInput | CourseStatusHistoryWhereInput[]
    OR?: CourseStatusHistoryWhereInput[]
    NOT?: CourseStatusHistoryWhereInput | CourseStatusHistoryWhereInput[]
    courseId?: StringFilter<"CourseStatusHistory"> | string
    fromStatus?: EnumRecordStatusNullableFilter<"CourseStatusHistory"> | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFilter<"CourseStatusHistory"> | $Enums.RecordStatus
    changedBy?: StringNullableFilter<"CourseStatusHistory"> | string | null
    reason?: StringNullableFilter<"CourseStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"CourseStatusHistory"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }, "id">

  export type CourseStatusHistoryOrderByWithAggregationInput = {
    id?: SortOrder
    courseId?: SortOrder
    fromStatus?: SortOrderInput | SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    changedAt?: SortOrder
    _count?: CourseStatusHistoryCountOrderByAggregateInput
    _max?: CourseStatusHistoryMaxOrderByAggregateInput
    _min?: CourseStatusHistoryMinOrderByAggregateInput
  }

  export type CourseStatusHistoryScalarWhereWithAggregatesInput = {
    AND?: CourseStatusHistoryScalarWhereWithAggregatesInput | CourseStatusHistoryScalarWhereWithAggregatesInput[]
    OR?: CourseStatusHistoryScalarWhereWithAggregatesInput[]
    NOT?: CourseStatusHistoryScalarWhereWithAggregatesInput | CourseStatusHistoryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CourseStatusHistory"> | string
    courseId?: StringWithAggregatesFilter<"CourseStatusHistory"> | string
    fromStatus?: EnumRecordStatusNullableWithAggregatesFilter<"CourseStatusHistory"> | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusWithAggregatesFilter<"CourseStatusHistory"> | $Enums.RecordStatus
    changedBy?: StringNullableWithAggregatesFilter<"CourseStatusHistory"> | string | null
    reason?: StringNullableWithAggregatesFilter<"CourseStatusHistory"> | string | null
    changedAt?: DateTimeWithAggregatesFilter<"CourseStatusHistory"> | Date | string
  }

  export type BatchStatusHistoryWhereInput = {
    AND?: BatchStatusHistoryWhereInput | BatchStatusHistoryWhereInput[]
    OR?: BatchStatusHistoryWhereInput[]
    NOT?: BatchStatusHistoryWhereInput | BatchStatusHistoryWhereInput[]
    id?: StringFilter<"BatchStatusHistory"> | string
    batchId?: StringFilter<"BatchStatusHistory"> | string
    fromStatus?: EnumBatchStatusNullableFilter<"BatchStatusHistory"> | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFilter<"BatchStatusHistory"> | $Enums.BatchStatus
    changedBy?: StringNullableFilter<"BatchStatusHistory"> | string | null
    reason?: StringNullableFilter<"BatchStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"BatchStatusHistory"> | Date | string
    batch?: XOR<BatchScalarRelationFilter, BatchWhereInput>
  }

  export type BatchStatusHistoryOrderByWithRelationInput = {
    id?: SortOrder
    batchId?: SortOrder
    fromStatus?: SortOrderInput | SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    changedAt?: SortOrder
    batch?: BatchOrderByWithRelationInput
  }

  export type BatchStatusHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: BatchStatusHistoryWhereInput | BatchStatusHistoryWhereInput[]
    OR?: BatchStatusHistoryWhereInput[]
    NOT?: BatchStatusHistoryWhereInput | BatchStatusHistoryWhereInput[]
    batchId?: StringFilter<"BatchStatusHistory"> | string
    fromStatus?: EnumBatchStatusNullableFilter<"BatchStatusHistory"> | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFilter<"BatchStatusHistory"> | $Enums.BatchStatus
    changedBy?: StringNullableFilter<"BatchStatusHistory"> | string | null
    reason?: StringNullableFilter<"BatchStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"BatchStatusHistory"> | Date | string
    batch?: XOR<BatchScalarRelationFilter, BatchWhereInput>
  }, "id">

  export type BatchStatusHistoryOrderByWithAggregationInput = {
    id?: SortOrder
    batchId?: SortOrder
    fromStatus?: SortOrderInput | SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrderInput | SortOrder
    reason?: SortOrderInput | SortOrder
    changedAt?: SortOrder
    _count?: BatchStatusHistoryCountOrderByAggregateInput
    _max?: BatchStatusHistoryMaxOrderByAggregateInput
    _min?: BatchStatusHistoryMinOrderByAggregateInput
  }

  export type BatchStatusHistoryScalarWhereWithAggregatesInput = {
    AND?: BatchStatusHistoryScalarWhereWithAggregatesInput | BatchStatusHistoryScalarWhereWithAggregatesInput[]
    OR?: BatchStatusHistoryScalarWhereWithAggregatesInput[]
    NOT?: BatchStatusHistoryScalarWhereWithAggregatesInput | BatchStatusHistoryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BatchStatusHistory"> | string
    batchId?: StringWithAggregatesFilter<"BatchStatusHistory"> | string
    fromStatus?: EnumBatchStatusNullableWithAggregatesFilter<"BatchStatusHistory"> | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusWithAggregatesFilter<"BatchStatusHistory"> | $Enums.BatchStatus
    changedBy?: StringNullableWithAggregatesFilter<"BatchStatusHistory"> | string | null
    reason?: StringNullableWithAggregatesFilter<"BatchStatusHistory"> | string | null
    changedAt?: DateTimeWithAggregatesFilter<"BatchStatusHistory"> | Date | string
  }

  export type StudentProfileWhereInput = {
    AND?: StudentProfileWhereInput | StudentProfileWhereInput[]
    OR?: StudentProfileWhereInput[]
    NOT?: StudentProfileWhereInput | StudentProfileWhereInput[]
    id?: StringFilter<"StudentProfile"> | string
    studentCode?: StringFilter<"StudentProfile"> | string
    studentName?: StringFilter<"StudentProfile"> | string
    mobileNumber?: StringFilter<"StudentProfile"> | string
    emailAddress?: StringFilter<"StudentProfile"> | string
    parentSpouseNumber?: StringNullableFilter<"StudentProfile"> | string | null
    location?: StringNullableFilter<"StudentProfile"> | string | null
    courseId?: StringNullableFilter<"StudentProfile"> | string | null
    courseInterested?: StringFilter<"StudentProfile"> | string
    facultyName?: StringNullableFilter<"StudentProfile"> | string | null
    batchName?: StringNullableFilter<"StudentProfile"> | string | null
    qualification?: StringNullableFilter<"StudentProfile"> | string | null
    passedOutYear?: IntNullableFilter<"StudentProfile"> | number | null
    currentStatus?: StringNullableFilter<"StudentProfile"> | string | null
    designation?: StringNullableFilter<"StudentProfile"> | string | null
    source?: StringNullableFilter<"StudentProfile"> | string | null
    actualFees?: IntNullableFilter<"StudentProfile"> | number | null
    registrationFees?: IntNullableFilter<"StudentProfile"> | number | null
    discount?: IntNullableFilter<"StudentProfile"> | number | null
    afterDiscount?: IntNullableFilter<"StudentProfile"> | number | null
    installment1?: IntNullableFilter<"StudentProfile"> | number | null
    installment2?: IntNullableFilter<"StudentProfile"> | number | null
    installment3?: IntNullableFilter<"StudentProfile"> | number | null
    totalAmount?: IntNullableFilter<"StudentProfile"> | number | null
    admissionDate?: StringFilter<"StudentProfile"> | string
    firstInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    firstInstallmentDate?: StringNullableFilter<"StudentProfile"> | string | null
    firstInstallmentStatus?: StringFilter<"StudentProfile"> | string
    firstInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    secondDueDate?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentStatus?: StringFilter<"StudentProfile"> | string
    secondInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    remarks?: StringNullableFilter<"StudentProfile"> | string | null
    recordStatus?: EnumRecordStatusFilter<"StudentProfile"> | $Enums.RecordStatus
    createdBy?: StringNullableFilter<"StudentProfile"> | string | null
    updatedBy?: StringNullableFilter<"StudentProfile"> | string | null
    createdAt?: DateTimeFilter<"StudentProfile"> | Date | string
    updatedAt?: DateTimeFilter<"StudentProfile"> | Date | string
    course?: XOR<CourseNullableScalarRelationFilter, CourseWhereInput> | null
  }

  export type StudentProfileOrderByWithRelationInput = {
    id?: SortOrder
    studentCode?: SortOrder
    studentName?: SortOrder
    mobileNumber?: SortOrder
    emailAddress?: SortOrder
    parentSpouseNumber?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    courseId?: SortOrderInput | SortOrder
    courseInterested?: SortOrder
    facultyName?: SortOrderInput | SortOrder
    batchName?: SortOrderInput | SortOrder
    qualification?: SortOrderInput | SortOrder
    passedOutYear?: SortOrderInput | SortOrder
    currentStatus?: SortOrderInput | SortOrder
    designation?: SortOrderInput | SortOrder
    source?: SortOrderInput | SortOrder
    actualFees?: SortOrderInput | SortOrder
    registrationFees?: SortOrderInput | SortOrder
    discount?: SortOrderInput | SortOrder
    afterDiscount?: SortOrderInput | SortOrder
    installment1?: SortOrderInput | SortOrder
    installment2?: SortOrderInput | SortOrder
    installment3?: SortOrderInput | SortOrder
    totalAmount?: SortOrderInput | SortOrder
    admissionDate?: SortOrder
    firstInstallmentAmount?: SortOrderInput | SortOrder
    firstInstallmentDate?: SortOrderInput | SortOrder
    firstInstallmentStatus?: SortOrder
    firstInstallmentPaidAt?: SortOrderInput | SortOrder
    secondInstallmentAmount?: SortOrderInput | SortOrder
    secondDueDate?: SortOrderInput | SortOrder
    secondInstallmentStatus?: SortOrder
    secondInstallmentPaidAt?: SortOrderInput | SortOrder
    remarks?: SortOrderInput | SortOrder
    recordStatus?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    course?: CourseOrderByWithRelationInput
  }

  export type StudentProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    studentCode?: string
    mobileNumber?: string
    emailAddress?: string
    AND?: StudentProfileWhereInput | StudentProfileWhereInput[]
    OR?: StudentProfileWhereInput[]
    NOT?: StudentProfileWhereInput | StudentProfileWhereInput[]
    studentName?: StringFilter<"StudentProfile"> | string
    parentSpouseNumber?: StringNullableFilter<"StudentProfile"> | string | null
    location?: StringNullableFilter<"StudentProfile"> | string | null
    courseId?: StringNullableFilter<"StudentProfile"> | string | null
    courseInterested?: StringFilter<"StudentProfile"> | string
    facultyName?: StringNullableFilter<"StudentProfile"> | string | null
    batchName?: StringNullableFilter<"StudentProfile"> | string | null
    qualification?: StringNullableFilter<"StudentProfile"> | string | null
    passedOutYear?: IntNullableFilter<"StudentProfile"> | number | null
    currentStatus?: StringNullableFilter<"StudentProfile"> | string | null
    designation?: StringNullableFilter<"StudentProfile"> | string | null
    source?: StringNullableFilter<"StudentProfile"> | string | null
    actualFees?: IntNullableFilter<"StudentProfile"> | number | null
    registrationFees?: IntNullableFilter<"StudentProfile"> | number | null
    discount?: IntNullableFilter<"StudentProfile"> | number | null
    afterDiscount?: IntNullableFilter<"StudentProfile"> | number | null
    installment1?: IntNullableFilter<"StudentProfile"> | number | null
    installment2?: IntNullableFilter<"StudentProfile"> | number | null
    installment3?: IntNullableFilter<"StudentProfile"> | number | null
    totalAmount?: IntNullableFilter<"StudentProfile"> | number | null
    admissionDate?: StringFilter<"StudentProfile"> | string
    firstInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    firstInstallmentDate?: StringNullableFilter<"StudentProfile"> | string | null
    firstInstallmentStatus?: StringFilter<"StudentProfile"> | string
    firstInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    secondDueDate?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentStatus?: StringFilter<"StudentProfile"> | string
    secondInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    remarks?: StringNullableFilter<"StudentProfile"> | string | null
    recordStatus?: EnumRecordStatusFilter<"StudentProfile"> | $Enums.RecordStatus
    createdBy?: StringNullableFilter<"StudentProfile"> | string | null
    updatedBy?: StringNullableFilter<"StudentProfile"> | string | null
    createdAt?: DateTimeFilter<"StudentProfile"> | Date | string
    updatedAt?: DateTimeFilter<"StudentProfile"> | Date | string
    course?: XOR<CourseNullableScalarRelationFilter, CourseWhereInput> | null
  }, "id" | "studentCode" | "mobileNumber" | "emailAddress">

  export type StudentProfileOrderByWithAggregationInput = {
    id?: SortOrder
    studentCode?: SortOrder
    studentName?: SortOrder
    mobileNumber?: SortOrder
    emailAddress?: SortOrder
    parentSpouseNumber?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    courseId?: SortOrderInput | SortOrder
    courseInterested?: SortOrder
    facultyName?: SortOrderInput | SortOrder
    batchName?: SortOrderInput | SortOrder
    qualification?: SortOrderInput | SortOrder
    passedOutYear?: SortOrderInput | SortOrder
    currentStatus?: SortOrderInput | SortOrder
    designation?: SortOrderInput | SortOrder
    source?: SortOrderInput | SortOrder
    actualFees?: SortOrderInput | SortOrder
    registrationFees?: SortOrderInput | SortOrder
    discount?: SortOrderInput | SortOrder
    afterDiscount?: SortOrderInput | SortOrder
    installment1?: SortOrderInput | SortOrder
    installment2?: SortOrderInput | SortOrder
    installment3?: SortOrderInput | SortOrder
    totalAmount?: SortOrderInput | SortOrder
    admissionDate?: SortOrder
    firstInstallmentAmount?: SortOrderInput | SortOrder
    firstInstallmentDate?: SortOrderInput | SortOrder
    firstInstallmentStatus?: SortOrder
    firstInstallmentPaidAt?: SortOrderInput | SortOrder
    secondInstallmentAmount?: SortOrderInput | SortOrder
    secondDueDate?: SortOrderInput | SortOrder
    secondInstallmentStatus?: SortOrder
    secondInstallmentPaidAt?: SortOrderInput | SortOrder
    remarks?: SortOrderInput | SortOrder
    recordStatus?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: StudentProfileCountOrderByAggregateInput
    _avg?: StudentProfileAvgOrderByAggregateInput
    _max?: StudentProfileMaxOrderByAggregateInput
    _min?: StudentProfileMinOrderByAggregateInput
    _sum?: StudentProfileSumOrderByAggregateInput
  }

  export type StudentProfileScalarWhereWithAggregatesInput = {
    AND?: StudentProfileScalarWhereWithAggregatesInput | StudentProfileScalarWhereWithAggregatesInput[]
    OR?: StudentProfileScalarWhereWithAggregatesInput[]
    NOT?: StudentProfileScalarWhereWithAggregatesInput | StudentProfileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"StudentProfile"> | string
    studentCode?: StringWithAggregatesFilter<"StudentProfile"> | string
    studentName?: StringWithAggregatesFilter<"StudentProfile"> | string
    mobileNumber?: StringWithAggregatesFilter<"StudentProfile"> | string
    emailAddress?: StringWithAggregatesFilter<"StudentProfile"> | string
    parentSpouseNumber?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    location?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    courseId?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    courseInterested?: StringWithAggregatesFilter<"StudentProfile"> | string
    facultyName?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    batchName?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    qualification?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    passedOutYear?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    currentStatus?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    designation?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    source?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    actualFees?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    registrationFees?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    discount?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    afterDiscount?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    installment1?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    installment2?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    installment3?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    totalAmount?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    admissionDate?: StringWithAggregatesFilter<"StudentProfile"> | string
    firstInstallmentAmount?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    firstInstallmentDate?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    firstInstallmentStatus?: StringWithAggregatesFilter<"StudentProfile"> | string
    firstInstallmentPaidAt?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    secondInstallmentAmount?: IntNullableWithAggregatesFilter<"StudentProfile"> | number | null
    secondDueDate?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    secondInstallmentStatus?: StringWithAggregatesFilter<"StudentProfile"> | string
    secondInstallmentPaidAt?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    remarks?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    recordStatus?: EnumRecordStatusWithAggregatesFilter<"StudentProfile"> | $Enums.RecordStatus
    createdBy?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"StudentProfile"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"StudentProfile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"StudentProfile"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventCreateNestedManyWithoutUserInput
    passwordResetTokens?: PasswordResetTokenCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutFacultyInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventUncheckedCreateNestedManyWithoutUserInput
    passwordResetTokens?: PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutFacultyInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUpdateManyWithoutUserNestedInput
    passwordResetTokens?: PasswordResetTokenUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutFacultyNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUncheckedUpdateManyWithoutUserNestedInput
    passwordResetTokens?: PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LoginEventCreateInput = {
    id?: string
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    user?: UserCreateNestedOneWithoutLoginEventsInput
  }

  export type LoginEventUncheckedCreateInput = {
    id?: string
    userId?: string | null
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type LoginEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutLoginEventsNestedInput
  }

  export type LoginEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LoginEventCreateManyInput = {
    id?: string
    userId?: string | null
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type LoginEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LoginEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenCreateInput = {
    id?: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutPasswordResetTokensInput
  }

  export type PasswordResetTokenUncheckedCreateInput = {
    id?: string
    userId: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
  }

  export type PasswordResetTokenUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPasswordResetTokensNestedInput
  }

  export type PasswordResetTokenUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenCreateManyInput = {
    id?: string
    userId: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
  }

  export type PasswordResetTokenUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseCreateInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleCreateNestedManyWithoutCourseInput
    batches?: BatchCreateNestedManyWithoutCourseInput
    students?: StudentProfileCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleUncheckedCreateNestedManyWithoutCourseInput
    batches?: BatchUncheckedCreateNestedManyWithoutCourseInput
    students?: StudentProfileUncheckedCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUpdateManyWithoutCourseNestedInput
    batches?: BatchUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUncheckedUpdateManyWithoutCourseNestedInput
    batches?: BatchUncheckedUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUncheckedUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type CourseCreateManyInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleCreateInput = {
    id?: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutModulesInput
  }

  export type CourseModuleUncheckedCreateInput = {
    id?: string
    courseId: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseModuleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutModulesNestedInput
  }

  export type CourseModuleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleCreateManyInput = {
    id?: string
    courseId: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseModuleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchCreateInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutBatchesInput
    facultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutBatchInput
    statusHistory?: BatchStatusHistoryCreateNestedManyWithoutBatchInput
  }

  export type BatchUncheckedCreateInput = {
    id?: string
    courseId: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutBatchInput
    statusHistory?: BatchStatusHistoryUncheckedCreateNestedManyWithoutBatchInput
  }

  export type BatchUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutBatchesNestedInput
    facultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutBatchNestedInput
    statusHistory?: BatchStatusHistoryUpdateManyWithoutBatchNestedInput
  }

  export type BatchUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchNestedInput
    statusHistory?: BatchStatusHistoryUncheckedUpdateManyWithoutBatchNestedInput
  }

  export type BatchCreateManyInput = {
    id?: string
    courseId: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentCreateInput = {
    id?: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    batch: BatchCreateNestedOneWithoutFacultyAssignmentsInput
    faculty: UserCreateNestedOneWithoutBatchFacultyAssignmentsInput
  }

  export type BatchFacultyAssignmentUncheckedCreateInput = {
    id?: string
    batchId: string
    facultyId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchFacultyAssignmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    batch?: BatchUpdateOneRequiredWithoutFacultyAssignmentsNestedInput
    faculty?: UserUpdateOneRequiredWithoutBatchFacultyAssignmentsNestedInput
  }

  export type BatchFacultyAssignmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    facultyId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentCreateManyInput = {
    id?: string
    batchId: string
    facultyId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchFacultyAssignmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    facultyId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryCreateInput = {
    id?: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
    course: CourseCreateNestedOneWithoutStatusHistoryInput
  }

  export type CourseStatusHistoryUncheckedCreateInput = {
    id?: string
    courseId: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type CourseStatusHistoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutStatusHistoryNestedInput
  }

  export type CourseStatusHistoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryCreateManyInput = {
    id?: string
    courseId: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type CourseStatusHistoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryCreateInput = {
    id?: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
    batch: BatchCreateNestedOneWithoutStatusHistoryInput
  }

  export type BatchStatusHistoryUncheckedCreateInput = {
    id?: string
    batchId: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type BatchStatusHistoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    batch?: BatchUpdateOneRequiredWithoutStatusHistoryNestedInput
  }

  export type BatchStatusHistoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryCreateManyInput = {
    id?: string
    batchId: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type BatchStatusHistoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileCreateInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course?: CourseCreateNestedOneWithoutStudentsInput
  }

  export type StudentProfileUncheckedCreateInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseId?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentProfileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneWithoutStudentsNestedInput
  }

  export type StudentProfileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileCreateManyInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseId?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentProfileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type LoginEventListRelationFilter = {
    every?: LoginEventWhereInput
    some?: LoginEventWhereInput
    none?: LoginEventWhereInput
  }

  export type PasswordResetTokenListRelationFilter = {
    every?: PasswordResetTokenWhereInput
    some?: PasswordResetTokenWhereInput
    none?: PasswordResetTokenWhereInput
  }

  export type BatchFacultyAssignmentListRelationFilter = {
    every?: BatchFacultyAssignmentWhereInput
    some?: BatchFacultyAssignmentWhereInput
    none?: BatchFacultyAssignmentWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type LoginEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PasswordResetTokenOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BatchFacultyAssignmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    userCode?: SortOrder
    fullName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    active?: SortOrder
    passwordHash?: SortOrder
    passwordChangedAt?: SortOrder
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
    failedLoginWindowExpiresAt?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    lastLogoutAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginUserAgent?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    userCode?: SortOrder
    fullName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    active?: SortOrder
    passwordHash?: SortOrder
    passwordChangedAt?: SortOrder
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
    failedLoginWindowExpiresAt?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    lastLogoutAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginUserAgent?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    userCode?: SortOrder
    fullName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    role?: SortOrder
    active?: SortOrder
    passwordHash?: SortOrder
    passwordChangedAt?: SortOrder
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
    failedLoginWindowExpiresAt?: SortOrder
    lockedUntil?: SortOrder
    lastLoginAt?: SortOrder
    lastLogoutAt?: SortOrder
    lastLoginIp?: SortOrder
    lastLoginUserAgent?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    refreshTokenVersion?: SortOrder
    failedLoginCount?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumLoginEventTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.LoginEventType | EnumLoginEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumLoginEventTypeFilter<$PrismaModel> | $Enums.LoginEventType
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type LoginEventCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    eventType?: SortOrder
    success?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    reason?: SortOrder
    meta?: SortOrder
    createdAt?: SortOrder
  }

  export type LoginEventMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    eventType?: SortOrder
    success?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type LoginEventMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    eventType?: SortOrder
    success?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type EnumLoginEventTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LoginEventType | EnumLoginEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumLoginEventTypeWithAggregatesFilter<$PrismaModel> | $Enums.LoginEventType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLoginEventTypeFilter<$PrismaModel>
    _max?: NestedEnumLoginEventTypeFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type PasswordResetTokenCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    expiresAt?: SortOrder
    usedAt?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
  }

  export type PasswordResetTokenMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    expiresAt?: SortOrder
    usedAt?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
  }

  export type PasswordResetTokenMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    tokenHash?: SortOrder
    expiresAt?: SortOrder
    usedAt?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumRecordStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRecordStatusFilter<$PrismaModel> | $Enums.RecordStatus
  }

  export type CourseModuleListRelationFilter = {
    every?: CourseModuleWhereInput
    some?: CourseModuleWhereInput
    none?: CourseModuleWhereInput
  }

  export type BatchListRelationFilter = {
    every?: BatchWhereInput
    some?: BatchWhereInput
    none?: BatchWhereInput
  }

  export type StudentProfileListRelationFilter = {
    every?: StudentProfileWhereInput
    some?: StudentProfileWhereInput
    none?: StudentProfileWhereInput
  }

  export type CourseStatusHistoryListRelationFilter = {
    every?: CourseStatusHistoryWhereInput
    some?: CourseStatusHistoryWhereInput
    none?: CourseStatusHistoryWhereInput
  }

  export type CourseModuleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BatchOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type StudentProfileOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourseStatusHistoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourseCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameKey?: SortOrder
    description?: SortOrder
    feeReference?: SortOrder
    mode?: SortOrder
    duration?: SortOrder
    hours?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseAvgOrderByAggregateInput = {
    duration?: SortOrder
    hours?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
  }

  export type CourseMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameKey?: SortOrder
    description?: SortOrder
    feeReference?: SortOrder
    mode?: SortOrder
    duration?: SortOrder
    hours?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nameKey?: SortOrder
    description?: SortOrder
    feeReference?: SortOrder
    mode?: SortOrder
    duration?: SortOrder
    hours?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseSumOrderByAggregateInput = {
    duration?: SortOrder
    hours?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installmentCount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumRecordStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRecordStatusWithAggregatesFilter<$PrismaModel> | $Enums.RecordStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRecordStatusFilter<$PrismaModel>
    _max?: NestedEnumRecordStatusFilter<$PrismaModel>
  }

  export type CourseScalarRelationFilter = {
    is?: CourseWhereInput
    isNot?: CourseWhereInput
  }

  export type CourseModuleCourseIdSequenceNoCompoundUniqueInput = {
    courseId: string
    sequenceNo: number
  }

  export type CourseModuleCourseIdTitleKeyCompoundUniqueInput = {
    courseId: string
    titleKey: string
  }

  export type CourseModuleCountOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    title?: SortOrder
    titleKey?: SortOrder
    description?: SortOrder
    sequenceNo?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseModuleAvgOrderByAggregateInput = {
    sequenceNo?: SortOrder
  }

  export type CourseModuleMaxOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    title?: SortOrder
    titleKey?: SortOrder
    description?: SortOrder
    sequenceNo?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseModuleMinOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    title?: SortOrder
    titleKey?: SortOrder
    description?: SortOrder
    sequenceNo?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseModuleSumOrderByAggregateInput = {
    sequenceNo?: SortOrder
  }

  export type EnumBatchStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBatchStatusFilter<$PrismaModel> | $Enums.BatchStatus
  }

  export type BatchStatusHistoryListRelationFilter = {
    every?: BatchStatusHistoryWhereInput
    some?: BatchStatusHistoryWhereInput
    none?: BatchStatusHistoryWhereInput
  }

  export type BatchStatusHistoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BatchCountOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    batchName?: SortOrder
    batchNameKey?: SortOrder
    description?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    capacity?: SortOrder
    enrolledCount?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BatchAvgOrderByAggregateInput = {
    capacity?: SortOrder
    enrolledCount?: SortOrder
  }

  export type BatchMaxOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    batchName?: SortOrder
    batchNameKey?: SortOrder
    description?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    capacity?: SortOrder
    enrolledCount?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BatchMinOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    batchName?: SortOrder
    batchNameKey?: SortOrder
    description?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    capacity?: SortOrder
    enrolledCount?: SortOrder
    status?: SortOrder
    statusChangedAt?: SortOrder
    statusChangedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BatchSumOrderByAggregateInput = {
    capacity?: SortOrder
    enrolledCount?: SortOrder
  }

  export type EnumBatchStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBatchStatusWithAggregatesFilter<$PrismaModel> | $Enums.BatchStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBatchStatusFilter<$PrismaModel>
    _max?: NestedEnumBatchStatusFilter<$PrismaModel>
  }

  export type EnumAssignmentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AssignmentStatus | EnumAssignmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAssignmentStatusFilter<$PrismaModel> | $Enums.AssignmentStatus
  }

  export type BatchScalarRelationFilter = {
    is?: BatchWhereInput
    isNot?: BatchWhereInput
  }

  export type BatchFacultyAssignmentCountOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    facultyId?: SortOrder
    assignedDate?: SortOrder
    assignedAt?: SortOrder
    releasedAt?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    assignedBy?: SortOrder
    releasedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BatchFacultyAssignmentMaxOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    facultyId?: SortOrder
    assignedDate?: SortOrder
    assignedAt?: SortOrder
    releasedAt?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    assignedBy?: SortOrder
    releasedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BatchFacultyAssignmentMinOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    facultyId?: SortOrder
    assignedDate?: SortOrder
    assignedAt?: SortOrder
    releasedAt?: SortOrder
    status?: SortOrder
    notes?: SortOrder
    assignedBy?: SortOrder
    releasedBy?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumAssignmentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AssignmentStatus | EnumAssignmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAssignmentStatusWithAggregatesFilter<$PrismaModel> | $Enums.AssignmentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAssignmentStatusFilter<$PrismaModel>
    _max?: NestedEnumAssignmentStatusFilter<$PrismaModel>
  }

  export type EnumRecordStatusNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRecordStatusNullableFilter<$PrismaModel> | $Enums.RecordStatus | null
  }

  export type CourseStatusHistoryCountOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type CourseStatusHistoryMaxOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type CourseStatusHistoryMinOrderByAggregateInput = {
    id?: SortOrder
    courseId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type EnumRecordStatusNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRecordStatusNullableWithAggregatesFilter<$PrismaModel> | $Enums.RecordStatus | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRecordStatusNullableFilter<$PrismaModel>
    _max?: NestedEnumRecordStatusNullableFilter<$PrismaModel>
  }

  export type EnumBatchStatusNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumBatchStatusNullableFilter<$PrismaModel> | $Enums.BatchStatus | null
  }

  export type BatchStatusHistoryCountOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type BatchStatusHistoryMaxOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type BatchStatusHistoryMinOrderByAggregateInput = {
    id?: SortOrder
    batchId?: SortOrder
    fromStatus?: SortOrder
    toStatus?: SortOrder
    changedBy?: SortOrder
    reason?: SortOrder
    changedAt?: SortOrder
  }

  export type EnumBatchStatusNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumBatchStatusNullableWithAggregatesFilter<$PrismaModel> | $Enums.BatchStatus | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumBatchStatusNullableFilter<$PrismaModel>
    _max?: NestedEnumBatchStatusNullableFilter<$PrismaModel>
  }

  export type CourseNullableScalarRelationFilter = {
    is?: CourseWhereInput | null
    isNot?: CourseWhereInput | null
  }

  export type StudentProfileCountOrderByAggregateInput = {
    id?: SortOrder
    studentCode?: SortOrder
    studentName?: SortOrder
    mobileNumber?: SortOrder
    emailAddress?: SortOrder
    parentSpouseNumber?: SortOrder
    location?: SortOrder
    courseId?: SortOrder
    courseInterested?: SortOrder
    facultyName?: SortOrder
    batchName?: SortOrder
    qualification?: SortOrder
    passedOutYear?: SortOrder
    currentStatus?: SortOrder
    designation?: SortOrder
    source?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    totalAmount?: SortOrder
    admissionDate?: SortOrder
    firstInstallmentAmount?: SortOrder
    firstInstallmentDate?: SortOrder
    firstInstallmentStatus?: SortOrder
    firstInstallmentPaidAt?: SortOrder
    secondInstallmentAmount?: SortOrder
    secondDueDate?: SortOrder
    secondInstallmentStatus?: SortOrder
    secondInstallmentPaidAt?: SortOrder
    remarks?: SortOrder
    recordStatus?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudentProfileAvgOrderByAggregateInput = {
    passedOutYear?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    totalAmount?: SortOrder
    firstInstallmentAmount?: SortOrder
    secondInstallmentAmount?: SortOrder
  }

  export type StudentProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    studentCode?: SortOrder
    studentName?: SortOrder
    mobileNumber?: SortOrder
    emailAddress?: SortOrder
    parentSpouseNumber?: SortOrder
    location?: SortOrder
    courseId?: SortOrder
    courseInterested?: SortOrder
    facultyName?: SortOrder
    batchName?: SortOrder
    qualification?: SortOrder
    passedOutYear?: SortOrder
    currentStatus?: SortOrder
    designation?: SortOrder
    source?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    totalAmount?: SortOrder
    admissionDate?: SortOrder
    firstInstallmentAmount?: SortOrder
    firstInstallmentDate?: SortOrder
    firstInstallmentStatus?: SortOrder
    firstInstallmentPaidAt?: SortOrder
    secondInstallmentAmount?: SortOrder
    secondDueDate?: SortOrder
    secondInstallmentStatus?: SortOrder
    secondInstallmentPaidAt?: SortOrder
    remarks?: SortOrder
    recordStatus?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudentProfileMinOrderByAggregateInput = {
    id?: SortOrder
    studentCode?: SortOrder
    studentName?: SortOrder
    mobileNumber?: SortOrder
    emailAddress?: SortOrder
    parentSpouseNumber?: SortOrder
    location?: SortOrder
    courseId?: SortOrder
    courseInterested?: SortOrder
    facultyName?: SortOrder
    batchName?: SortOrder
    qualification?: SortOrder
    passedOutYear?: SortOrder
    currentStatus?: SortOrder
    designation?: SortOrder
    source?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    totalAmount?: SortOrder
    admissionDate?: SortOrder
    firstInstallmentAmount?: SortOrder
    firstInstallmentDate?: SortOrder
    firstInstallmentStatus?: SortOrder
    firstInstallmentPaidAt?: SortOrder
    secondInstallmentAmount?: SortOrder
    secondDueDate?: SortOrder
    secondInstallmentStatus?: SortOrder
    secondInstallmentPaidAt?: SortOrder
    remarks?: SortOrder
    recordStatus?: SortOrder
    createdBy?: SortOrder
    updatedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StudentProfileSumOrderByAggregateInput = {
    passedOutYear?: SortOrder
    actualFees?: SortOrder
    registrationFees?: SortOrder
    discount?: SortOrder
    afterDiscount?: SortOrder
    installment1?: SortOrder
    installment2?: SortOrder
    installment3?: SortOrder
    totalAmount?: SortOrder
    firstInstallmentAmount?: SortOrder
    secondInstallmentAmount?: SortOrder
  }

  export type LoginEventCreateNestedManyWithoutUserInput = {
    create?: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput> | LoginEventCreateWithoutUserInput[] | LoginEventUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LoginEventCreateOrConnectWithoutUserInput | LoginEventCreateOrConnectWithoutUserInput[]
    createMany?: LoginEventCreateManyUserInputEnvelope
    connect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
  }

  export type PasswordResetTokenCreateNestedManyWithoutUserInput = {
    create?: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput> | PasswordResetTokenCreateWithoutUserInput[] | PasswordResetTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PasswordResetTokenCreateOrConnectWithoutUserInput | PasswordResetTokenCreateOrConnectWithoutUserInput[]
    createMany?: PasswordResetTokenCreateManyUserInputEnvelope
    connect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
  }

  export type BatchFacultyAssignmentCreateNestedManyWithoutFacultyInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput> | BatchFacultyAssignmentCreateWithoutFacultyInput[] | BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput | BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput[]
    createMany?: BatchFacultyAssignmentCreateManyFacultyInputEnvelope
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
  }

  export type LoginEventUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput> | LoginEventCreateWithoutUserInput[] | LoginEventUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LoginEventCreateOrConnectWithoutUserInput | LoginEventCreateOrConnectWithoutUserInput[]
    createMany?: LoginEventCreateManyUserInputEnvelope
    connect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
  }

  export type PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput> | PasswordResetTokenCreateWithoutUserInput[] | PasswordResetTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PasswordResetTokenCreateOrConnectWithoutUserInput | PasswordResetTokenCreateOrConnectWithoutUserInput[]
    createMany?: PasswordResetTokenCreateManyUserInputEnvelope
    connect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
  }

  export type BatchFacultyAssignmentUncheckedCreateNestedManyWithoutFacultyInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput> | BatchFacultyAssignmentCreateWithoutFacultyInput[] | BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput | BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput[]
    createMany?: BatchFacultyAssignmentCreateManyFacultyInputEnvelope
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type LoginEventUpdateManyWithoutUserNestedInput = {
    create?: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput> | LoginEventCreateWithoutUserInput[] | LoginEventUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LoginEventCreateOrConnectWithoutUserInput | LoginEventCreateOrConnectWithoutUserInput[]
    upsert?: LoginEventUpsertWithWhereUniqueWithoutUserInput | LoginEventUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LoginEventCreateManyUserInputEnvelope
    set?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    disconnect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    delete?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    connect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    update?: LoginEventUpdateWithWhereUniqueWithoutUserInput | LoginEventUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LoginEventUpdateManyWithWhereWithoutUserInput | LoginEventUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LoginEventScalarWhereInput | LoginEventScalarWhereInput[]
  }

  export type PasswordResetTokenUpdateManyWithoutUserNestedInput = {
    create?: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput> | PasswordResetTokenCreateWithoutUserInput[] | PasswordResetTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PasswordResetTokenCreateOrConnectWithoutUserInput | PasswordResetTokenCreateOrConnectWithoutUserInput[]
    upsert?: PasswordResetTokenUpsertWithWhereUniqueWithoutUserInput | PasswordResetTokenUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PasswordResetTokenCreateManyUserInputEnvelope
    set?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    disconnect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    delete?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    connect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    update?: PasswordResetTokenUpdateWithWhereUniqueWithoutUserInput | PasswordResetTokenUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PasswordResetTokenUpdateManyWithWhereWithoutUserInput | PasswordResetTokenUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PasswordResetTokenScalarWhereInput | PasswordResetTokenScalarWhereInput[]
  }

  export type BatchFacultyAssignmentUpdateManyWithoutFacultyNestedInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput> | BatchFacultyAssignmentCreateWithoutFacultyInput[] | BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput | BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput[]
    upsert?: BatchFacultyAssignmentUpsertWithWhereUniqueWithoutFacultyInput | BatchFacultyAssignmentUpsertWithWhereUniqueWithoutFacultyInput[]
    createMany?: BatchFacultyAssignmentCreateManyFacultyInputEnvelope
    set?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    disconnect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    delete?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    update?: BatchFacultyAssignmentUpdateWithWhereUniqueWithoutFacultyInput | BatchFacultyAssignmentUpdateWithWhereUniqueWithoutFacultyInput[]
    updateMany?: BatchFacultyAssignmentUpdateManyWithWhereWithoutFacultyInput | BatchFacultyAssignmentUpdateManyWithWhereWithoutFacultyInput[]
    deleteMany?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
  }

  export type LoginEventUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput> | LoginEventCreateWithoutUserInput[] | LoginEventUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LoginEventCreateOrConnectWithoutUserInput | LoginEventCreateOrConnectWithoutUserInput[]
    upsert?: LoginEventUpsertWithWhereUniqueWithoutUserInput | LoginEventUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LoginEventCreateManyUserInputEnvelope
    set?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    disconnect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    delete?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    connect?: LoginEventWhereUniqueInput | LoginEventWhereUniqueInput[]
    update?: LoginEventUpdateWithWhereUniqueWithoutUserInput | LoginEventUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LoginEventUpdateManyWithWhereWithoutUserInput | LoginEventUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LoginEventScalarWhereInput | LoginEventScalarWhereInput[]
  }

  export type PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput> | PasswordResetTokenCreateWithoutUserInput[] | PasswordResetTokenUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PasswordResetTokenCreateOrConnectWithoutUserInput | PasswordResetTokenCreateOrConnectWithoutUserInput[]
    upsert?: PasswordResetTokenUpsertWithWhereUniqueWithoutUserInput | PasswordResetTokenUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PasswordResetTokenCreateManyUserInputEnvelope
    set?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    disconnect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    delete?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    connect?: PasswordResetTokenWhereUniqueInput | PasswordResetTokenWhereUniqueInput[]
    update?: PasswordResetTokenUpdateWithWhereUniqueWithoutUserInput | PasswordResetTokenUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PasswordResetTokenUpdateManyWithWhereWithoutUserInput | PasswordResetTokenUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PasswordResetTokenScalarWhereInput | PasswordResetTokenScalarWhereInput[]
  }

  export type BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyNestedInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput> | BatchFacultyAssignmentCreateWithoutFacultyInput[] | BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput | BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput[]
    upsert?: BatchFacultyAssignmentUpsertWithWhereUniqueWithoutFacultyInput | BatchFacultyAssignmentUpsertWithWhereUniqueWithoutFacultyInput[]
    createMany?: BatchFacultyAssignmentCreateManyFacultyInputEnvelope
    set?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    disconnect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    delete?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    update?: BatchFacultyAssignmentUpdateWithWhereUniqueWithoutFacultyInput | BatchFacultyAssignmentUpdateWithWhereUniqueWithoutFacultyInput[]
    updateMany?: BatchFacultyAssignmentUpdateManyWithWhereWithoutFacultyInput | BatchFacultyAssignmentUpdateManyWithWhereWithoutFacultyInput[]
    deleteMany?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutLoginEventsInput = {
    create?: XOR<UserCreateWithoutLoginEventsInput, UserUncheckedCreateWithoutLoginEventsInput>
    connectOrCreate?: UserCreateOrConnectWithoutLoginEventsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumLoginEventTypeFieldUpdateOperationsInput = {
    set?: $Enums.LoginEventType
  }

  export type UserUpdateOneWithoutLoginEventsNestedInput = {
    create?: XOR<UserCreateWithoutLoginEventsInput, UserUncheckedCreateWithoutLoginEventsInput>
    connectOrCreate?: UserCreateOrConnectWithoutLoginEventsInput
    upsert?: UserUpsertWithoutLoginEventsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLoginEventsInput, UserUpdateWithoutLoginEventsInput>, UserUncheckedUpdateWithoutLoginEventsInput>
  }

  export type UserCreateNestedOneWithoutPasswordResetTokensInput = {
    create?: XOR<UserCreateWithoutPasswordResetTokensInput, UserUncheckedCreateWithoutPasswordResetTokensInput>
    connectOrCreate?: UserCreateOrConnectWithoutPasswordResetTokensInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutPasswordResetTokensNestedInput = {
    create?: XOR<UserCreateWithoutPasswordResetTokensInput, UserUncheckedCreateWithoutPasswordResetTokensInput>
    connectOrCreate?: UserCreateOrConnectWithoutPasswordResetTokensInput
    upsert?: UserUpsertWithoutPasswordResetTokensInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPasswordResetTokensInput, UserUpdateWithoutPasswordResetTokensInput>, UserUncheckedUpdateWithoutPasswordResetTokensInput>
  }

  export type CourseModuleCreateNestedManyWithoutCourseInput = {
    create?: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput> | CourseModuleCreateWithoutCourseInput[] | CourseModuleUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseModuleCreateOrConnectWithoutCourseInput | CourseModuleCreateOrConnectWithoutCourseInput[]
    createMany?: CourseModuleCreateManyCourseInputEnvelope
    connect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
  }

  export type BatchCreateNestedManyWithoutCourseInput = {
    create?: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput> | BatchCreateWithoutCourseInput[] | BatchUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: BatchCreateOrConnectWithoutCourseInput | BatchCreateOrConnectWithoutCourseInput[]
    createMany?: BatchCreateManyCourseInputEnvelope
    connect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
  }

  export type StudentProfileCreateNestedManyWithoutCourseInput = {
    create?: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput> | StudentProfileCreateWithoutCourseInput[] | StudentProfileUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: StudentProfileCreateOrConnectWithoutCourseInput | StudentProfileCreateOrConnectWithoutCourseInput[]
    createMany?: StudentProfileCreateManyCourseInputEnvelope
    connect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
  }

  export type CourseStatusHistoryCreateNestedManyWithoutCourseInput = {
    create?: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput> | CourseStatusHistoryCreateWithoutCourseInput[] | CourseStatusHistoryUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseStatusHistoryCreateOrConnectWithoutCourseInput | CourseStatusHistoryCreateOrConnectWithoutCourseInput[]
    createMany?: CourseStatusHistoryCreateManyCourseInputEnvelope
    connect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
  }

  export type CourseModuleUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput> | CourseModuleCreateWithoutCourseInput[] | CourseModuleUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseModuleCreateOrConnectWithoutCourseInput | CourseModuleCreateOrConnectWithoutCourseInput[]
    createMany?: CourseModuleCreateManyCourseInputEnvelope
    connect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
  }

  export type BatchUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput> | BatchCreateWithoutCourseInput[] | BatchUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: BatchCreateOrConnectWithoutCourseInput | BatchCreateOrConnectWithoutCourseInput[]
    createMany?: BatchCreateManyCourseInputEnvelope
    connect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
  }

  export type StudentProfileUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput> | StudentProfileCreateWithoutCourseInput[] | StudentProfileUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: StudentProfileCreateOrConnectWithoutCourseInput | StudentProfileCreateOrConnectWithoutCourseInput[]
    createMany?: StudentProfileCreateManyCourseInputEnvelope
    connect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
  }

  export type CourseStatusHistoryUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput> | CourseStatusHistoryCreateWithoutCourseInput[] | CourseStatusHistoryUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseStatusHistoryCreateOrConnectWithoutCourseInput | CourseStatusHistoryCreateOrConnectWithoutCourseInput[]
    createMany?: CourseStatusHistoryCreateManyCourseInputEnvelope
    connect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumRecordStatusFieldUpdateOperationsInput = {
    set?: $Enums.RecordStatus
  }

  export type CourseModuleUpdateManyWithoutCourseNestedInput = {
    create?: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput> | CourseModuleCreateWithoutCourseInput[] | CourseModuleUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseModuleCreateOrConnectWithoutCourseInput | CourseModuleCreateOrConnectWithoutCourseInput[]
    upsert?: CourseModuleUpsertWithWhereUniqueWithoutCourseInput | CourseModuleUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: CourseModuleCreateManyCourseInputEnvelope
    set?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    disconnect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    delete?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    connect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    update?: CourseModuleUpdateWithWhereUniqueWithoutCourseInput | CourseModuleUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: CourseModuleUpdateManyWithWhereWithoutCourseInput | CourseModuleUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: CourseModuleScalarWhereInput | CourseModuleScalarWhereInput[]
  }

  export type BatchUpdateManyWithoutCourseNestedInput = {
    create?: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput> | BatchCreateWithoutCourseInput[] | BatchUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: BatchCreateOrConnectWithoutCourseInput | BatchCreateOrConnectWithoutCourseInput[]
    upsert?: BatchUpsertWithWhereUniqueWithoutCourseInput | BatchUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: BatchCreateManyCourseInputEnvelope
    set?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    disconnect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    delete?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    connect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    update?: BatchUpdateWithWhereUniqueWithoutCourseInput | BatchUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: BatchUpdateManyWithWhereWithoutCourseInput | BatchUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: BatchScalarWhereInput | BatchScalarWhereInput[]
  }

  export type StudentProfileUpdateManyWithoutCourseNestedInput = {
    create?: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput> | StudentProfileCreateWithoutCourseInput[] | StudentProfileUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: StudentProfileCreateOrConnectWithoutCourseInput | StudentProfileCreateOrConnectWithoutCourseInput[]
    upsert?: StudentProfileUpsertWithWhereUniqueWithoutCourseInput | StudentProfileUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: StudentProfileCreateManyCourseInputEnvelope
    set?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    disconnect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    delete?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    connect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    update?: StudentProfileUpdateWithWhereUniqueWithoutCourseInput | StudentProfileUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: StudentProfileUpdateManyWithWhereWithoutCourseInput | StudentProfileUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: StudentProfileScalarWhereInput | StudentProfileScalarWhereInput[]
  }

  export type CourseStatusHistoryUpdateManyWithoutCourseNestedInput = {
    create?: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput> | CourseStatusHistoryCreateWithoutCourseInput[] | CourseStatusHistoryUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseStatusHistoryCreateOrConnectWithoutCourseInput | CourseStatusHistoryCreateOrConnectWithoutCourseInput[]
    upsert?: CourseStatusHistoryUpsertWithWhereUniqueWithoutCourseInput | CourseStatusHistoryUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: CourseStatusHistoryCreateManyCourseInputEnvelope
    set?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    disconnect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    delete?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    connect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    update?: CourseStatusHistoryUpdateWithWhereUniqueWithoutCourseInput | CourseStatusHistoryUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: CourseStatusHistoryUpdateManyWithWhereWithoutCourseInput | CourseStatusHistoryUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: CourseStatusHistoryScalarWhereInput | CourseStatusHistoryScalarWhereInput[]
  }

  export type CourseModuleUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput> | CourseModuleCreateWithoutCourseInput[] | CourseModuleUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseModuleCreateOrConnectWithoutCourseInput | CourseModuleCreateOrConnectWithoutCourseInput[]
    upsert?: CourseModuleUpsertWithWhereUniqueWithoutCourseInput | CourseModuleUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: CourseModuleCreateManyCourseInputEnvelope
    set?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    disconnect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    delete?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    connect?: CourseModuleWhereUniqueInput | CourseModuleWhereUniqueInput[]
    update?: CourseModuleUpdateWithWhereUniqueWithoutCourseInput | CourseModuleUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: CourseModuleUpdateManyWithWhereWithoutCourseInput | CourseModuleUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: CourseModuleScalarWhereInput | CourseModuleScalarWhereInput[]
  }

  export type BatchUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput> | BatchCreateWithoutCourseInput[] | BatchUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: BatchCreateOrConnectWithoutCourseInput | BatchCreateOrConnectWithoutCourseInput[]
    upsert?: BatchUpsertWithWhereUniqueWithoutCourseInput | BatchUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: BatchCreateManyCourseInputEnvelope
    set?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    disconnect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    delete?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    connect?: BatchWhereUniqueInput | BatchWhereUniqueInput[]
    update?: BatchUpdateWithWhereUniqueWithoutCourseInput | BatchUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: BatchUpdateManyWithWhereWithoutCourseInput | BatchUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: BatchScalarWhereInput | BatchScalarWhereInput[]
  }

  export type StudentProfileUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput> | StudentProfileCreateWithoutCourseInput[] | StudentProfileUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: StudentProfileCreateOrConnectWithoutCourseInput | StudentProfileCreateOrConnectWithoutCourseInput[]
    upsert?: StudentProfileUpsertWithWhereUniqueWithoutCourseInput | StudentProfileUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: StudentProfileCreateManyCourseInputEnvelope
    set?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    disconnect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    delete?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    connect?: StudentProfileWhereUniqueInput | StudentProfileWhereUniqueInput[]
    update?: StudentProfileUpdateWithWhereUniqueWithoutCourseInput | StudentProfileUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: StudentProfileUpdateManyWithWhereWithoutCourseInput | StudentProfileUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: StudentProfileScalarWhereInput | StudentProfileScalarWhereInput[]
  }

  export type CourseStatusHistoryUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput> | CourseStatusHistoryCreateWithoutCourseInput[] | CourseStatusHistoryUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: CourseStatusHistoryCreateOrConnectWithoutCourseInput | CourseStatusHistoryCreateOrConnectWithoutCourseInput[]
    upsert?: CourseStatusHistoryUpsertWithWhereUniqueWithoutCourseInput | CourseStatusHistoryUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: CourseStatusHistoryCreateManyCourseInputEnvelope
    set?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    disconnect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    delete?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    connect?: CourseStatusHistoryWhereUniqueInput | CourseStatusHistoryWhereUniqueInput[]
    update?: CourseStatusHistoryUpdateWithWhereUniqueWithoutCourseInput | CourseStatusHistoryUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: CourseStatusHistoryUpdateManyWithWhereWithoutCourseInput | CourseStatusHistoryUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: CourseStatusHistoryScalarWhereInput | CourseStatusHistoryScalarWhereInput[]
  }

  export type CourseCreateNestedOneWithoutModulesInput = {
    create?: XOR<CourseCreateWithoutModulesInput, CourseUncheckedCreateWithoutModulesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutModulesInput
    connect?: CourseWhereUniqueInput
  }

  export type CourseUpdateOneRequiredWithoutModulesNestedInput = {
    create?: XOR<CourseCreateWithoutModulesInput, CourseUncheckedCreateWithoutModulesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutModulesInput
    upsert?: CourseUpsertWithoutModulesInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutModulesInput, CourseUpdateWithoutModulesInput>, CourseUncheckedUpdateWithoutModulesInput>
  }

  export type CourseCreateNestedOneWithoutBatchesInput = {
    create?: XOR<CourseCreateWithoutBatchesInput, CourseUncheckedCreateWithoutBatchesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutBatchesInput
    connect?: CourseWhereUniqueInput
  }

  export type BatchFacultyAssignmentCreateNestedManyWithoutBatchInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput> | BatchFacultyAssignmentCreateWithoutBatchInput[] | BatchFacultyAssignmentUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutBatchInput | BatchFacultyAssignmentCreateOrConnectWithoutBatchInput[]
    createMany?: BatchFacultyAssignmentCreateManyBatchInputEnvelope
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
  }

  export type BatchStatusHistoryCreateNestedManyWithoutBatchInput = {
    create?: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput> | BatchStatusHistoryCreateWithoutBatchInput[] | BatchStatusHistoryUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchStatusHistoryCreateOrConnectWithoutBatchInput | BatchStatusHistoryCreateOrConnectWithoutBatchInput[]
    createMany?: BatchStatusHistoryCreateManyBatchInputEnvelope
    connect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
  }

  export type BatchFacultyAssignmentUncheckedCreateNestedManyWithoutBatchInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput> | BatchFacultyAssignmentCreateWithoutBatchInput[] | BatchFacultyAssignmentUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutBatchInput | BatchFacultyAssignmentCreateOrConnectWithoutBatchInput[]
    createMany?: BatchFacultyAssignmentCreateManyBatchInputEnvelope
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
  }

  export type BatchStatusHistoryUncheckedCreateNestedManyWithoutBatchInput = {
    create?: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput> | BatchStatusHistoryCreateWithoutBatchInput[] | BatchStatusHistoryUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchStatusHistoryCreateOrConnectWithoutBatchInput | BatchStatusHistoryCreateOrConnectWithoutBatchInput[]
    createMany?: BatchStatusHistoryCreateManyBatchInputEnvelope
    connect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
  }

  export type EnumBatchStatusFieldUpdateOperationsInput = {
    set?: $Enums.BatchStatus
  }

  export type CourseUpdateOneRequiredWithoutBatchesNestedInput = {
    create?: XOR<CourseCreateWithoutBatchesInput, CourseUncheckedCreateWithoutBatchesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutBatchesInput
    upsert?: CourseUpsertWithoutBatchesInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutBatchesInput, CourseUpdateWithoutBatchesInput>, CourseUncheckedUpdateWithoutBatchesInput>
  }

  export type BatchFacultyAssignmentUpdateManyWithoutBatchNestedInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput> | BatchFacultyAssignmentCreateWithoutBatchInput[] | BatchFacultyAssignmentUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutBatchInput | BatchFacultyAssignmentCreateOrConnectWithoutBatchInput[]
    upsert?: BatchFacultyAssignmentUpsertWithWhereUniqueWithoutBatchInput | BatchFacultyAssignmentUpsertWithWhereUniqueWithoutBatchInput[]
    createMany?: BatchFacultyAssignmentCreateManyBatchInputEnvelope
    set?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    disconnect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    delete?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    update?: BatchFacultyAssignmentUpdateWithWhereUniqueWithoutBatchInput | BatchFacultyAssignmentUpdateWithWhereUniqueWithoutBatchInput[]
    updateMany?: BatchFacultyAssignmentUpdateManyWithWhereWithoutBatchInput | BatchFacultyAssignmentUpdateManyWithWhereWithoutBatchInput[]
    deleteMany?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
  }

  export type BatchStatusHistoryUpdateManyWithoutBatchNestedInput = {
    create?: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput> | BatchStatusHistoryCreateWithoutBatchInput[] | BatchStatusHistoryUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchStatusHistoryCreateOrConnectWithoutBatchInput | BatchStatusHistoryCreateOrConnectWithoutBatchInput[]
    upsert?: BatchStatusHistoryUpsertWithWhereUniqueWithoutBatchInput | BatchStatusHistoryUpsertWithWhereUniqueWithoutBatchInput[]
    createMany?: BatchStatusHistoryCreateManyBatchInputEnvelope
    set?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    disconnect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    delete?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    connect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    update?: BatchStatusHistoryUpdateWithWhereUniqueWithoutBatchInput | BatchStatusHistoryUpdateWithWhereUniqueWithoutBatchInput[]
    updateMany?: BatchStatusHistoryUpdateManyWithWhereWithoutBatchInput | BatchStatusHistoryUpdateManyWithWhereWithoutBatchInput[]
    deleteMany?: BatchStatusHistoryScalarWhereInput | BatchStatusHistoryScalarWhereInput[]
  }

  export type BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchNestedInput = {
    create?: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput> | BatchFacultyAssignmentCreateWithoutBatchInput[] | BatchFacultyAssignmentUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchFacultyAssignmentCreateOrConnectWithoutBatchInput | BatchFacultyAssignmentCreateOrConnectWithoutBatchInput[]
    upsert?: BatchFacultyAssignmentUpsertWithWhereUniqueWithoutBatchInput | BatchFacultyAssignmentUpsertWithWhereUniqueWithoutBatchInput[]
    createMany?: BatchFacultyAssignmentCreateManyBatchInputEnvelope
    set?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    disconnect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    delete?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    connect?: BatchFacultyAssignmentWhereUniqueInput | BatchFacultyAssignmentWhereUniqueInput[]
    update?: BatchFacultyAssignmentUpdateWithWhereUniqueWithoutBatchInput | BatchFacultyAssignmentUpdateWithWhereUniqueWithoutBatchInput[]
    updateMany?: BatchFacultyAssignmentUpdateManyWithWhereWithoutBatchInput | BatchFacultyAssignmentUpdateManyWithWhereWithoutBatchInput[]
    deleteMany?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
  }

  export type BatchStatusHistoryUncheckedUpdateManyWithoutBatchNestedInput = {
    create?: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput> | BatchStatusHistoryCreateWithoutBatchInput[] | BatchStatusHistoryUncheckedCreateWithoutBatchInput[]
    connectOrCreate?: BatchStatusHistoryCreateOrConnectWithoutBatchInput | BatchStatusHistoryCreateOrConnectWithoutBatchInput[]
    upsert?: BatchStatusHistoryUpsertWithWhereUniqueWithoutBatchInput | BatchStatusHistoryUpsertWithWhereUniqueWithoutBatchInput[]
    createMany?: BatchStatusHistoryCreateManyBatchInputEnvelope
    set?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    disconnect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    delete?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    connect?: BatchStatusHistoryWhereUniqueInput | BatchStatusHistoryWhereUniqueInput[]
    update?: BatchStatusHistoryUpdateWithWhereUniqueWithoutBatchInput | BatchStatusHistoryUpdateWithWhereUniqueWithoutBatchInput[]
    updateMany?: BatchStatusHistoryUpdateManyWithWhereWithoutBatchInput | BatchStatusHistoryUpdateManyWithWhereWithoutBatchInput[]
    deleteMany?: BatchStatusHistoryScalarWhereInput | BatchStatusHistoryScalarWhereInput[]
  }

  export type BatchCreateNestedOneWithoutFacultyAssignmentsInput = {
    create?: XOR<BatchCreateWithoutFacultyAssignmentsInput, BatchUncheckedCreateWithoutFacultyAssignmentsInput>
    connectOrCreate?: BatchCreateOrConnectWithoutFacultyAssignmentsInput
    connect?: BatchWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutBatchFacultyAssignmentsInput = {
    create?: XOR<UserCreateWithoutBatchFacultyAssignmentsInput, UserUncheckedCreateWithoutBatchFacultyAssignmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutBatchFacultyAssignmentsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumAssignmentStatusFieldUpdateOperationsInput = {
    set?: $Enums.AssignmentStatus
  }

  export type BatchUpdateOneRequiredWithoutFacultyAssignmentsNestedInput = {
    create?: XOR<BatchCreateWithoutFacultyAssignmentsInput, BatchUncheckedCreateWithoutFacultyAssignmentsInput>
    connectOrCreate?: BatchCreateOrConnectWithoutFacultyAssignmentsInput
    upsert?: BatchUpsertWithoutFacultyAssignmentsInput
    connect?: BatchWhereUniqueInput
    update?: XOR<XOR<BatchUpdateToOneWithWhereWithoutFacultyAssignmentsInput, BatchUpdateWithoutFacultyAssignmentsInput>, BatchUncheckedUpdateWithoutFacultyAssignmentsInput>
  }

  export type UserUpdateOneRequiredWithoutBatchFacultyAssignmentsNestedInput = {
    create?: XOR<UserCreateWithoutBatchFacultyAssignmentsInput, UserUncheckedCreateWithoutBatchFacultyAssignmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutBatchFacultyAssignmentsInput
    upsert?: UserUpsertWithoutBatchFacultyAssignmentsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutBatchFacultyAssignmentsInput, UserUpdateWithoutBatchFacultyAssignmentsInput>, UserUncheckedUpdateWithoutBatchFacultyAssignmentsInput>
  }

  export type CourseCreateNestedOneWithoutStatusHistoryInput = {
    create?: XOR<CourseCreateWithoutStatusHistoryInput, CourseUncheckedCreateWithoutStatusHistoryInput>
    connectOrCreate?: CourseCreateOrConnectWithoutStatusHistoryInput
    connect?: CourseWhereUniqueInput
  }

  export type NullableEnumRecordStatusFieldUpdateOperationsInput = {
    set?: $Enums.RecordStatus | null
  }

  export type CourseUpdateOneRequiredWithoutStatusHistoryNestedInput = {
    create?: XOR<CourseCreateWithoutStatusHistoryInput, CourseUncheckedCreateWithoutStatusHistoryInput>
    connectOrCreate?: CourseCreateOrConnectWithoutStatusHistoryInput
    upsert?: CourseUpsertWithoutStatusHistoryInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutStatusHistoryInput, CourseUpdateWithoutStatusHistoryInput>, CourseUncheckedUpdateWithoutStatusHistoryInput>
  }

  export type BatchCreateNestedOneWithoutStatusHistoryInput = {
    create?: XOR<BatchCreateWithoutStatusHistoryInput, BatchUncheckedCreateWithoutStatusHistoryInput>
    connectOrCreate?: BatchCreateOrConnectWithoutStatusHistoryInput
    connect?: BatchWhereUniqueInput
  }

  export type NullableEnumBatchStatusFieldUpdateOperationsInput = {
    set?: $Enums.BatchStatus | null
  }

  export type BatchUpdateOneRequiredWithoutStatusHistoryNestedInput = {
    create?: XOR<BatchCreateWithoutStatusHistoryInput, BatchUncheckedCreateWithoutStatusHistoryInput>
    connectOrCreate?: BatchCreateOrConnectWithoutStatusHistoryInput
    upsert?: BatchUpsertWithoutStatusHistoryInput
    connect?: BatchWhereUniqueInput
    update?: XOR<XOR<BatchUpdateToOneWithWhereWithoutStatusHistoryInput, BatchUpdateWithoutStatusHistoryInput>, BatchUncheckedUpdateWithoutStatusHistoryInput>
  }

  export type CourseCreateNestedOneWithoutStudentsInput = {
    create?: XOR<CourseCreateWithoutStudentsInput, CourseUncheckedCreateWithoutStudentsInput>
    connectOrCreate?: CourseCreateOrConnectWithoutStudentsInput
    connect?: CourseWhereUniqueInput
  }

  export type CourseUpdateOneWithoutStudentsNestedInput = {
    create?: XOR<CourseCreateWithoutStudentsInput, CourseUncheckedCreateWithoutStudentsInput>
    connectOrCreate?: CourseCreateOrConnectWithoutStudentsInput
    upsert?: CourseUpsertWithoutStudentsInput
    disconnect?: CourseWhereInput | boolean
    delete?: CourseWhereInput | boolean
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutStudentsInput, CourseUpdateWithoutStudentsInput>, CourseUncheckedUpdateWithoutStudentsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumLoginEventTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.LoginEventType | EnumLoginEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumLoginEventTypeFilter<$PrismaModel> | $Enums.LoginEventType
  }

  export type NestedEnumLoginEventTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LoginEventType | EnumLoginEventTypeFieldRefInput<$PrismaModel>
    in?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.LoginEventType[] | ListEnumLoginEventTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumLoginEventTypeWithAggregatesFilter<$PrismaModel> | $Enums.LoginEventType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLoginEventTypeFilter<$PrismaModel>
    _max?: NestedEnumLoginEventTypeFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumRecordStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRecordStatusFilter<$PrismaModel> | $Enums.RecordStatus
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumRecordStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRecordStatusWithAggregatesFilter<$PrismaModel> | $Enums.RecordStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRecordStatusFilter<$PrismaModel>
    _max?: NestedEnumRecordStatusFilter<$PrismaModel>
  }

  export type NestedEnumBatchStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBatchStatusFilter<$PrismaModel> | $Enums.BatchStatus
  }

  export type NestedEnumBatchStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBatchStatusWithAggregatesFilter<$PrismaModel> | $Enums.BatchStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBatchStatusFilter<$PrismaModel>
    _max?: NestedEnumBatchStatusFilter<$PrismaModel>
  }

  export type NestedEnumAssignmentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AssignmentStatus | EnumAssignmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAssignmentStatusFilter<$PrismaModel> | $Enums.AssignmentStatus
  }

  export type NestedEnumAssignmentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AssignmentStatus | EnumAssignmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AssignmentStatus[] | ListEnumAssignmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAssignmentStatusWithAggregatesFilter<$PrismaModel> | $Enums.AssignmentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAssignmentStatusFilter<$PrismaModel>
    _max?: NestedEnumAssignmentStatusFilter<$PrismaModel>
  }

  export type NestedEnumRecordStatusNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRecordStatusNullableFilter<$PrismaModel> | $Enums.RecordStatus | null
  }

  export type NestedEnumRecordStatusNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RecordStatus | EnumRecordStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RecordStatus[] | ListEnumRecordStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRecordStatusNullableWithAggregatesFilter<$PrismaModel> | $Enums.RecordStatus | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRecordStatusNullableFilter<$PrismaModel>
    _max?: NestedEnumRecordStatusNullableFilter<$PrismaModel>
  }

  export type NestedEnumBatchStatusNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumBatchStatusNullableFilter<$PrismaModel> | $Enums.BatchStatus | null
  }

  export type NestedEnumBatchStatusNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BatchStatus | EnumBatchStatusFieldRefInput<$PrismaModel> | null
    in?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.BatchStatus[] | ListEnumBatchStatusFieldRefInput<$PrismaModel> | null
    not?: NestedEnumBatchStatusNullableWithAggregatesFilter<$PrismaModel> | $Enums.BatchStatus | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumBatchStatusNullableFilter<$PrismaModel>
    _max?: NestedEnumBatchStatusNullableFilter<$PrismaModel>
  }

  export type LoginEventCreateWithoutUserInput = {
    id?: string
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type LoginEventUncheckedCreateWithoutUserInput = {
    id?: string
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type LoginEventCreateOrConnectWithoutUserInput = {
    where: LoginEventWhereUniqueInput
    create: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput>
  }

  export type LoginEventCreateManyUserInputEnvelope = {
    data: LoginEventCreateManyUserInput | LoginEventCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type PasswordResetTokenCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
  }

  export type PasswordResetTokenUncheckedCreateWithoutUserInput = {
    id?: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
  }

  export type PasswordResetTokenCreateOrConnectWithoutUserInput = {
    where: PasswordResetTokenWhereUniqueInput
    create: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput>
  }

  export type PasswordResetTokenCreateManyUserInputEnvelope = {
    data: PasswordResetTokenCreateManyUserInput | PasswordResetTokenCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type BatchFacultyAssignmentCreateWithoutFacultyInput = {
    id?: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    batch: BatchCreateNestedOneWithoutFacultyAssignmentsInput
  }

  export type BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput = {
    id?: string
    batchId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchFacultyAssignmentCreateOrConnectWithoutFacultyInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    create: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput>
  }

  export type BatchFacultyAssignmentCreateManyFacultyInputEnvelope = {
    data: BatchFacultyAssignmentCreateManyFacultyInput | BatchFacultyAssignmentCreateManyFacultyInput[]
    skipDuplicates?: boolean
  }

  export type LoginEventUpsertWithWhereUniqueWithoutUserInput = {
    where: LoginEventWhereUniqueInput
    update: XOR<LoginEventUpdateWithoutUserInput, LoginEventUncheckedUpdateWithoutUserInput>
    create: XOR<LoginEventCreateWithoutUserInput, LoginEventUncheckedCreateWithoutUserInput>
  }

  export type LoginEventUpdateWithWhereUniqueWithoutUserInput = {
    where: LoginEventWhereUniqueInput
    data: XOR<LoginEventUpdateWithoutUserInput, LoginEventUncheckedUpdateWithoutUserInput>
  }

  export type LoginEventUpdateManyWithWhereWithoutUserInput = {
    where: LoginEventScalarWhereInput
    data: XOR<LoginEventUpdateManyMutationInput, LoginEventUncheckedUpdateManyWithoutUserInput>
  }

  export type LoginEventScalarWhereInput = {
    AND?: LoginEventScalarWhereInput | LoginEventScalarWhereInput[]
    OR?: LoginEventScalarWhereInput[]
    NOT?: LoginEventScalarWhereInput | LoginEventScalarWhereInput[]
    id?: StringFilter<"LoginEvent"> | string
    userId?: StringNullableFilter<"LoginEvent"> | string | null
    eventType?: EnumLoginEventTypeFilter<"LoginEvent"> | $Enums.LoginEventType
    success?: BoolFilter<"LoginEvent"> | boolean
    ipAddress?: StringNullableFilter<"LoginEvent"> | string | null
    userAgent?: StringNullableFilter<"LoginEvent"> | string | null
    reason?: StringNullableFilter<"LoginEvent"> | string | null
    meta?: JsonNullableFilter<"LoginEvent">
    createdAt?: DateTimeFilter<"LoginEvent"> | Date | string
  }

  export type PasswordResetTokenUpsertWithWhereUniqueWithoutUserInput = {
    where: PasswordResetTokenWhereUniqueInput
    update: XOR<PasswordResetTokenUpdateWithoutUserInput, PasswordResetTokenUncheckedUpdateWithoutUserInput>
    create: XOR<PasswordResetTokenCreateWithoutUserInput, PasswordResetTokenUncheckedCreateWithoutUserInput>
  }

  export type PasswordResetTokenUpdateWithWhereUniqueWithoutUserInput = {
    where: PasswordResetTokenWhereUniqueInput
    data: XOR<PasswordResetTokenUpdateWithoutUserInput, PasswordResetTokenUncheckedUpdateWithoutUserInput>
  }

  export type PasswordResetTokenUpdateManyWithWhereWithoutUserInput = {
    where: PasswordResetTokenScalarWhereInput
    data: XOR<PasswordResetTokenUpdateManyMutationInput, PasswordResetTokenUncheckedUpdateManyWithoutUserInput>
  }

  export type PasswordResetTokenScalarWhereInput = {
    AND?: PasswordResetTokenScalarWhereInput | PasswordResetTokenScalarWhereInput[]
    OR?: PasswordResetTokenScalarWhereInput[]
    NOT?: PasswordResetTokenScalarWhereInput | PasswordResetTokenScalarWhereInput[]
    id?: StringFilter<"PasswordResetToken"> | string
    userId?: StringFilter<"PasswordResetToken"> | string
    tokenHash?: StringFilter<"PasswordResetToken"> | string
    expiresAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
    usedAt?: DateTimeNullableFilter<"PasswordResetToken"> | Date | string | null
    createdBy?: StringNullableFilter<"PasswordResetToken"> | string | null
    createdAt?: DateTimeFilter<"PasswordResetToken"> | Date | string
  }

  export type BatchFacultyAssignmentUpsertWithWhereUniqueWithoutFacultyInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    update: XOR<BatchFacultyAssignmentUpdateWithoutFacultyInput, BatchFacultyAssignmentUncheckedUpdateWithoutFacultyInput>
    create: XOR<BatchFacultyAssignmentCreateWithoutFacultyInput, BatchFacultyAssignmentUncheckedCreateWithoutFacultyInput>
  }

  export type BatchFacultyAssignmentUpdateWithWhereUniqueWithoutFacultyInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    data: XOR<BatchFacultyAssignmentUpdateWithoutFacultyInput, BatchFacultyAssignmentUncheckedUpdateWithoutFacultyInput>
  }

  export type BatchFacultyAssignmentUpdateManyWithWhereWithoutFacultyInput = {
    where: BatchFacultyAssignmentScalarWhereInput
    data: XOR<BatchFacultyAssignmentUpdateManyMutationInput, BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyInput>
  }

  export type BatchFacultyAssignmentScalarWhereInput = {
    AND?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
    OR?: BatchFacultyAssignmentScalarWhereInput[]
    NOT?: BatchFacultyAssignmentScalarWhereInput | BatchFacultyAssignmentScalarWhereInput[]
    id?: StringFilter<"BatchFacultyAssignment"> | string
    batchId?: StringFilter<"BatchFacultyAssignment"> | string
    facultyId?: StringFilter<"BatchFacultyAssignment"> | string
    assignedDate?: StringFilter<"BatchFacultyAssignment"> | string
    assignedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    releasedAt?: DateTimeNullableFilter<"BatchFacultyAssignment"> | Date | string | null
    status?: EnumAssignmentStatusFilter<"BatchFacultyAssignment"> | $Enums.AssignmentStatus
    notes?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    assignedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    releasedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    updatedBy?: StringNullableFilter<"BatchFacultyAssignment"> | string | null
    createdAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
    updatedAt?: DateTimeFilter<"BatchFacultyAssignment"> | Date | string
  }

  export type UserCreateWithoutLoginEventsInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    passwordResetTokens?: PasswordResetTokenCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutFacultyInput
  }

  export type UserUncheckedCreateWithoutLoginEventsInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    passwordResetTokens?: PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutFacultyInput
  }

  export type UserCreateOrConnectWithoutLoginEventsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLoginEventsInput, UserUncheckedCreateWithoutLoginEventsInput>
  }

  export type UserUpsertWithoutLoginEventsInput = {
    update: XOR<UserUpdateWithoutLoginEventsInput, UserUncheckedUpdateWithoutLoginEventsInput>
    create: XOR<UserCreateWithoutLoginEventsInput, UserUncheckedCreateWithoutLoginEventsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLoginEventsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLoginEventsInput, UserUncheckedUpdateWithoutLoginEventsInput>
  }

  export type UserUpdateWithoutLoginEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    passwordResetTokens?: PasswordResetTokenUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutFacultyNestedInput
  }

  export type UserUncheckedUpdateWithoutLoginEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    passwordResetTokens?: PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyNestedInput
  }

  export type UserCreateWithoutPasswordResetTokensInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutFacultyInput
  }

  export type UserUncheckedCreateWithoutPasswordResetTokensInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventUncheckedCreateNestedManyWithoutUserInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutFacultyInput
  }

  export type UserCreateOrConnectWithoutPasswordResetTokensInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPasswordResetTokensInput, UserUncheckedCreateWithoutPasswordResetTokensInput>
  }

  export type UserUpsertWithoutPasswordResetTokensInput = {
    update: XOR<UserUpdateWithoutPasswordResetTokensInput, UserUncheckedUpdateWithoutPasswordResetTokensInput>
    create: XOR<UserCreateWithoutPasswordResetTokensInput, UserUncheckedCreateWithoutPasswordResetTokensInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPasswordResetTokensInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPasswordResetTokensInput, UserUncheckedUpdateWithoutPasswordResetTokensInput>
  }

  export type UserUpdateWithoutPasswordResetTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutFacultyNestedInput
  }

  export type UserUncheckedUpdateWithoutPasswordResetTokensInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUncheckedUpdateManyWithoutUserNestedInput
    batchFacultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyNestedInput
  }

  export type CourseModuleCreateWithoutCourseInput = {
    id?: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseModuleUncheckedCreateWithoutCourseInput = {
    id?: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseModuleCreateOrConnectWithoutCourseInput = {
    where: CourseModuleWhereUniqueInput
    create: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput>
  }

  export type CourseModuleCreateManyCourseInputEnvelope = {
    data: CourseModuleCreateManyCourseInput | CourseModuleCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type BatchCreateWithoutCourseInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    facultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutBatchInput
    statusHistory?: BatchStatusHistoryCreateNestedManyWithoutBatchInput
  }

  export type BatchUncheckedCreateWithoutCourseInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutBatchInput
    statusHistory?: BatchStatusHistoryUncheckedCreateNestedManyWithoutBatchInput
  }

  export type BatchCreateOrConnectWithoutCourseInput = {
    where: BatchWhereUniqueInput
    create: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput>
  }

  export type BatchCreateManyCourseInputEnvelope = {
    data: BatchCreateManyCourseInput | BatchCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type StudentProfileCreateWithoutCourseInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentProfileUncheckedCreateWithoutCourseInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentProfileCreateOrConnectWithoutCourseInput = {
    where: StudentProfileWhereUniqueInput
    create: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput>
  }

  export type StudentProfileCreateManyCourseInputEnvelope = {
    data: StudentProfileCreateManyCourseInput | StudentProfileCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type CourseStatusHistoryCreateWithoutCourseInput = {
    id?: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type CourseStatusHistoryUncheckedCreateWithoutCourseInput = {
    id?: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type CourseStatusHistoryCreateOrConnectWithoutCourseInput = {
    where: CourseStatusHistoryWhereUniqueInput
    create: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput>
  }

  export type CourseStatusHistoryCreateManyCourseInputEnvelope = {
    data: CourseStatusHistoryCreateManyCourseInput | CourseStatusHistoryCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type CourseModuleUpsertWithWhereUniqueWithoutCourseInput = {
    where: CourseModuleWhereUniqueInput
    update: XOR<CourseModuleUpdateWithoutCourseInput, CourseModuleUncheckedUpdateWithoutCourseInput>
    create: XOR<CourseModuleCreateWithoutCourseInput, CourseModuleUncheckedCreateWithoutCourseInput>
  }

  export type CourseModuleUpdateWithWhereUniqueWithoutCourseInput = {
    where: CourseModuleWhereUniqueInput
    data: XOR<CourseModuleUpdateWithoutCourseInput, CourseModuleUncheckedUpdateWithoutCourseInput>
  }

  export type CourseModuleUpdateManyWithWhereWithoutCourseInput = {
    where: CourseModuleScalarWhereInput
    data: XOR<CourseModuleUpdateManyMutationInput, CourseModuleUncheckedUpdateManyWithoutCourseInput>
  }

  export type CourseModuleScalarWhereInput = {
    AND?: CourseModuleScalarWhereInput | CourseModuleScalarWhereInput[]
    OR?: CourseModuleScalarWhereInput[]
    NOT?: CourseModuleScalarWhereInput | CourseModuleScalarWhereInput[]
    id?: StringFilter<"CourseModule"> | string
    courseId?: StringFilter<"CourseModule"> | string
    title?: StringFilter<"CourseModule"> | string
    titleKey?: StringFilter<"CourseModule"> | string
    description?: StringNullableFilter<"CourseModule"> | string | null
    sequenceNo?: IntFilter<"CourseModule"> | number
    status?: EnumRecordStatusFilter<"CourseModule"> | $Enums.RecordStatus
    statusChangedAt?: DateTimeNullableFilter<"CourseModule"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdBy?: StringNullableFilter<"CourseModule"> | string | null
    updatedBy?: StringNullableFilter<"CourseModule"> | string | null
    createdAt?: DateTimeFilter<"CourseModule"> | Date | string
    updatedAt?: DateTimeFilter<"CourseModule"> | Date | string
  }

  export type BatchUpsertWithWhereUniqueWithoutCourseInput = {
    where: BatchWhereUniqueInput
    update: XOR<BatchUpdateWithoutCourseInput, BatchUncheckedUpdateWithoutCourseInput>
    create: XOR<BatchCreateWithoutCourseInput, BatchUncheckedCreateWithoutCourseInput>
  }

  export type BatchUpdateWithWhereUniqueWithoutCourseInput = {
    where: BatchWhereUniqueInput
    data: XOR<BatchUpdateWithoutCourseInput, BatchUncheckedUpdateWithoutCourseInput>
  }

  export type BatchUpdateManyWithWhereWithoutCourseInput = {
    where: BatchScalarWhereInput
    data: XOR<BatchUpdateManyMutationInput, BatchUncheckedUpdateManyWithoutCourseInput>
  }

  export type BatchScalarWhereInput = {
    AND?: BatchScalarWhereInput | BatchScalarWhereInput[]
    OR?: BatchScalarWhereInput[]
    NOT?: BatchScalarWhereInput | BatchScalarWhereInput[]
    id?: StringFilter<"Batch"> | string
    courseId?: StringFilter<"Batch"> | string
    batchName?: StringFilter<"Batch"> | string
    batchNameKey?: StringFilter<"Batch"> | string
    description?: StringNullableFilter<"Batch"> | string | null
    startDate?: StringFilter<"Batch"> | string
    endDate?: StringFilter<"Batch"> | string
    startTime?: StringFilter<"Batch"> | string
    endTime?: StringFilter<"Batch"> | string
    capacity?: IntFilter<"Batch"> | number
    enrolledCount?: IntFilter<"Batch"> | number
    status?: EnumBatchStatusFilter<"Batch"> | $Enums.BatchStatus
    statusChangedAt?: DateTimeNullableFilter<"Batch"> | Date | string | null
    statusChangedBy?: StringNullableFilter<"Batch"> | string | null
    createdBy?: StringNullableFilter<"Batch"> | string | null
    updatedBy?: StringNullableFilter<"Batch"> | string | null
    createdAt?: DateTimeFilter<"Batch"> | Date | string
    updatedAt?: DateTimeFilter<"Batch"> | Date | string
  }

  export type StudentProfileUpsertWithWhereUniqueWithoutCourseInput = {
    where: StudentProfileWhereUniqueInput
    update: XOR<StudentProfileUpdateWithoutCourseInput, StudentProfileUncheckedUpdateWithoutCourseInput>
    create: XOR<StudentProfileCreateWithoutCourseInput, StudentProfileUncheckedCreateWithoutCourseInput>
  }

  export type StudentProfileUpdateWithWhereUniqueWithoutCourseInput = {
    where: StudentProfileWhereUniqueInput
    data: XOR<StudentProfileUpdateWithoutCourseInput, StudentProfileUncheckedUpdateWithoutCourseInput>
  }

  export type StudentProfileUpdateManyWithWhereWithoutCourseInput = {
    where: StudentProfileScalarWhereInput
    data: XOR<StudentProfileUpdateManyMutationInput, StudentProfileUncheckedUpdateManyWithoutCourseInput>
  }

  export type StudentProfileScalarWhereInput = {
    AND?: StudentProfileScalarWhereInput | StudentProfileScalarWhereInput[]
    OR?: StudentProfileScalarWhereInput[]
    NOT?: StudentProfileScalarWhereInput | StudentProfileScalarWhereInput[]
    id?: StringFilter<"StudentProfile"> | string
    studentCode?: StringFilter<"StudentProfile"> | string
    studentName?: StringFilter<"StudentProfile"> | string
    mobileNumber?: StringFilter<"StudentProfile"> | string
    emailAddress?: StringFilter<"StudentProfile"> | string
    parentSpouseNumber?: StringNullableFilter<"StudentProfile"> | string | null
    location?: StringNullableFilter<"StudentProfile"> | string | null
    courseId?: StringNullableFilter<"StudentProfile"> | string | null
    courseInterested?: StringFilter<"StudentProfile"> | string
    facultyName?: StringNullableFilter<"StudentProfile"> | string | null
    batchName?: StringNullableFilter<"StudentProfile"> | string | null
    qualification?: StringNullableFilter<"StudentProfile"> | string | null
    passedOutYear?: IntNullableFilter<"StudentProfile"> | number | null
    currentStatus?: StringNullableFilter<"StudentProfile"> | string | null
    designation?: StringNullableFilter<"StudentProfile"> | string | null
    source?: StringNullableFilter<"StudentProfile"> | string | null
    actualFees?: IntNullableFilter<"StudentProfile"> | number | null
    registrationFees?: IntNullableFilter<"StudentProfile"> | number | null
    discount?: IntNullableFilter<"StudentProfile"> | number | null
    afterDiscount?: IntNullableFilter<"StudentProfile"> | number | null
    installment1?: IntNullableFilter<"StudentProfile"> | number | null
    installment2?: IntNullableFilter<"StudentProfile"> | number | null
    installment3?: IntNullableFilter<"StudentProfile"> | number | null
    totalAmount?: IntNullableFilter<"StudentProfile"> | number | null
    admissionDate?: StringFilter<"StudentProfile"> | string
    firstInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    firstInstallmentDate?: StringNullableFilter<"StudentProfile"> | string | null
    firstInstallmentStatus?: StringFilter<"StudentProfile"> | string
    firstInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentAmount?: IntNullableFilter<"StudentProfile"> | number | null
    secondDueDate?: StringNullableFilter<"StudentProfile"> | string | null
    secondInstallmentStatus?: StringFilter<"StudentProfile"> | string
    secondInstallmentPaidAt?: StringNullableFilter<"StudentProfile"> | string | null
    remarks?: StringNullableFilter<"StudentProfile"> | string | null
    recordStatus?: EnumRecordStatusFilter<"StudentProfile"> | $Enums.RecordStatus
    createdBy?: StringNullableFilter<"StudentProfile"> | string | null
    updatedBy?: StringNullableFilter<"StudentProfile"> | string | null
    createdAt?: DateTimeFilter<"StudentProfile"> | Date | string
    updatedAt?: DateTimeFilter<"StudentProfile"> | Date | string
  }

  export type CourseStatusHistoryUpsertWithWhereUniqueWithoutCourseInput = {
    where: CourseStatusHistoryWhereUniqueInput
    update: XOR<CourseStatusHistoryUpdateWithoutCourseInput, CourseStatusHistoryUncheckedUpdateWithoutCourseInput>
    create: XOR<CourseStatusHistoryCreateWithoutCourseInput, CourseStatusHistoryUncheckedCreateWithoutCourseInput>
  }

  export type CourseStatusHistoryUpdateWithWhereUniqueWithoutCourseInput = {
    where: CourseStatusHistoryWhereUniqueInput
    data: XOR<CourseStatusHistoryUpdateWithoutCourseInput, CourseStatusHistoryUncheckedUpdateWithoutCourseInput>
  }

  export type CourseStatusHistoryUpdateManyWithWhereWithoutCourseInput = {
    where: CourseStatusHistoryScalarWhereInput
    data: XOR<CourseStatusHistoryUpdateManyMutationInput, CourseStatusHistoryUncheckedUpdateManyWithoutCourseInput>
  }

  export type CourseStatusHistoryScalarWhereInput = {
    AND?: CourseStatusHistoryScalarWhereInput | CourseStatusHistoryScalarWhereInput[]
    OR?: CourseStatusHistoryScalarWhereInput[]
    NOT?: CourseStatusHistoryScalarWhereInput | CourseStatusHistoryScalarWhereInput[]
    id?: StringFilter<"CourseStatusHistory"> | string
    courseId?: StringFilter<"CourseStatusHistory"> | string
    fromStatus?: EnumRecordStatusNullableFilter<"CourseStatusHistory"> | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFilter<"CourseStatusHistory"> | $Enums.RecordStatus
    changedBy?: StringNullableFilter<"CourseStatusHistory"> | string | null
    reason?: StringNullableFilter<"CourseStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"CourseStatusHistory"> | Date | string
  }

  export type CourseCreateWithoutModulesInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    batches?: BatchCreateNestedManyWithoutCourseInput
    students?: StudentProfileCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutModulesInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    batches?: BatchUncheckedCreateNestedManyWithoutCourseInput
    students?: StudentProfileUncheckedCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutModulesInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutModulesInput, CourseUncheckedCreateWithoutModulesInput>
  }

  export type CourseUpsertWithoutModulesInput = {
    update: XOR<CourseUpdateWithoutModulesInput, CourseUncheckedUpdateWithoutModulesInput>
    create: XOR<CourseCreateWithoutModulesInput, CourseUncheckedCreateWithoutModulesInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutModulesInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutModulesInput, CourseUncheckedUpdateWithoutModulesInput>
  }

  export type CourseUpdateWithoutModulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    batches?: BatchUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutModulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    batches?: BatchUncheckedUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUncheckedUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type CourseCreateWithoutBatchesInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleCreateNestedManyWithoutCourseInput
    students?: StudentProfileCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutBatchesInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleUncheckedCreateNestedManyWithoutCourseInput
    students?: StudentProfileUncheckedCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutBatchesInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutBatchesInput, CourseUncheckedCreateWithoutBatchesInput>
  }

  export type BatchFacultyAssignmentCreateWithoutBatchInput = {
    id?: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    faculty: UserCreateNestedOneWithoutBatchFacultyAssignmentsInput
  }

  export type BatchFacultyAssignmentUncheckedCreateWithoutBatchInput = {
    id?: string
    facultyId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchFacultyAssignmentCreateOrConnectWithoutBatchInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    create: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput>
  }

  export type BatchFacultyAssignmentCreateManyBatchInputEnvelope = {
    data: BatchFacultyAssignmentCreateManyBatchInput | BatchFacultyAssignmentCreateManyBatchInput[]
    skipDuplicates?: boolean
  }

  export type BatchStatusHistoryCreateWithoutBatchInput = {
    id?: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type BatchStatusHistoryUncheckedCreateWithoutBatchInput = {
    id?: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type BatchStatusHistoryCreateOrConnectWithoutBatchInput = {
    where: BatchStatusHistoryWhereUniqueInput
    create: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput>
  }

  export type BatchStatusHistoryCreateManyBatchInputEnvelope = {
    data: BatchStatusHistoryCreateManyBatchInput | BatchStatusHistoryCreateManyBatchInput[]
    skipDuplicates?: boolean
  }

  export type CourseUpsertWithoutBatchesInput = {
    update: XOR<CourseUpdateWithoutBatchesInput, CourseUncheckedUpdateWithoutBatchesInput>
    create: XOR<CourseCreateWithoutBatchesInput, CourseUncheckedCreateWithoutBatchesInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutBatchesInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutBatchesInput, CourseUncheckedUpdateWithoutBatchesInput>
  }

  export type CourseUpdateWithoutBatchesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutBatchesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUncheckedUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUncheckedUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type BatchFacultyAssignmentUpsertWithWhereUniqueWithoutBatchInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    update: XOR<BatchFacultyAssignmentUpdateWithoutBatchInput, BatchFacultyAssignmentUncheckedUpdateWithoutBatchInput>
    create: XOR<BatchFacultyAssignmentCreateWithoutBatchInput, BatchFacultyAssignmentUncheckedCreateWithoutBatchInput>
  }

  export type BatchFacultyAssignmentUpdateWithWhereUniqueWithoutBatchInput = {
    where: BatchFacultyAssignmentWhereUniqueInput
    data: XOR<BatchFacultyAssignmentUpdateWithoutBatchInput, BatchFacultyAssignmentUncheckedUpdateWithoutBatchInput>
  }

  export type BatchFacultyAssignmentUpdateManyWithWhereWithoutBatchInput = {
    where: BatchFacultyAssignmentScalarWhereInput
    data: XOR<BatchFacultyAssignmentUpdateManyMutationInput, BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchInput>
  }

  export type BatchStatusHistoryUpsertWithWhereUniqueWithoutBatchInput = {
    where: BatchStatusHistoryWhereUniqueInput
    update: XOR<BatchStatusHistoryUpdateWithoutBatchInput, BatchStatusHistoryUncheckedUpdateWithoutBatchInput>
    create: XOR<BatchStatusHistoryCreateWithoutBatchInput, BatchStatusHistoryUncheckedCreateWithoutBatchInput>
  }

  export type BatchStatusHistoryUpdateWithWhereUniqueWithoutBatchInput = {
    where: BatchStatusHistoryWhereUniqueInput
    data: XOR<BatchStatusHistoryUpdateWithoutBatchInput, BatchStatusHistoryUncheckedUpdateWithoutBatchInput>
  }

  export type BatchStatusHistoryUpdateManyWithWhereWithoutBatchInput = {
    where: BatchStatusHistoryScalarWhereInput
    data: XOR<BatchStatusHistoryUpdateManyMutationInput, BatchStatusHistoryUncheckedUpdateManyWithoutBatchInput>
  }

  export type BatchStatusHistoryScalarWhereInput = {
    AND?: BatchStatusHistoryScalarWhereInput | BatchStatusHistoryScalarWhereInput[]
    OR?: BatchStatusHistoryScalarWhereInput[]
    NOT?: BatchStatusHistoryScalarWhereInput | BatchStatusHistoryScalarWhereInput[]
    id?: StringFilter<"BatchStatusHistory"> | string
    batchId?: StringFilter<"BatchStatusHistory"> | string
    fromStatus?: EnumBatchStatusNullableFilter<"BatchStatusHistory"> | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFilter<"BatchStatusHistory"> | $Enums.BatchStatus
    changedBy?: StringNullableFilter<"BatchStatusHistory"> | string | null
    reason?: StringNullableFilter<"BatchStatusHistory"> | string | null
    changedAt?: DateTimeFilter<"BatchStatusHistory"> | Date | string
  }

  export type BatchCreateWithoutFacultyAssignmentsInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutBatchesInput
    statusHistory?: BatchStatusHistoryCreateNestedManyWithoutBatchInput
  }

  export type BatchUncheckedCreateWithoutFacultyAssignmentsInput = {
    id?: string
    courseId: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    statusHistory?: BatchStatusHistoryUncheckedCreateNestedManyWithoutBatchInput
  }

  export type BatchCreateOrConnectWithoutFacultyAssignmentsInput = {
    where: BatchWhereUniqueInput
    create: XOR<BatchCreateWithoutFacultyAssignmentsInput, BatchUncheckedCreateWithoutFacultyAssignmentsInput>
  }

  export type UserCreateWithoutBatchFacultyAssignmentsInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventCreateNestedManyWithoutUserInput
    passwordResetTokens?: PasswordResetTokenCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutBatchFacultyAssignmentsInput = {
    id?: string
    userCode: string
    fullName: string
    email: string
    phone?: string | null
    role: $Enums.UserRole
    active?: boolean
    passwordHash: string
    passwordChangedAt?: Date | string | null
    refreshTokenVersion?: number
    failedLoginCount?: number
    failedLoginWindowExpiresAt?: Date | string | null
    lockedUntil?: Date | string | null
    lastLoginAt?: Date | string | null
    lastLogoutAt?: Date | string | null
    lastLoginIp?: string | null
    lastLoginUserAgent?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    loginEvents?: LoginEventUncheckedCreateNestedManyWithoutUserInput
    passwordResetTokens?: PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutBatchFacultyAssignmentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutBatchFacultyAssignmentsInput, UserUncheckedCreateWithoutBatchFacultyAssignmentsInput>
  }

  export type BatchUpsertWithoutFacultyAssignmentsInput = {
    update: XOR<BatchUpdateWithoutFacultyAssignmentsInput, BatchUncheckedUpdateWithoutFacultyAssignmentsInput>
    create: XOR<BatchCreateWithoutFacultyAssignmentsInput, BatchUncheckedCreateWithoutFacultyAssignmentsInput>
    where?: BatchWhereInput
  }

  export type BatchUpdateToOneWithWhereWithoutFacultyAssignmentsInput = {
    where?: BatchWhereInput
    data: XOR<BatchUpdateWithoutFacultyAssignmentsInput, BatchUncheckedUpdateWithoutFacultyAssignmentsInput>
  }

  export type BatchUpdateWithoutFacultyAssignmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutBatchesNestedInput
    statusHistory?: BatchStatusHistoryUpdateManyWithoutBatchNestedInput
  }

  export type BatchUncheckedUpdateWithoutFacultyAssignmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    statusHistory?: BatchStatusHistoryUncheckedUpdateManyWithoutBatchNestedInput
  }

  export type UserUpsertWithoutBatchFacultyAssignmentsInput = {
    update: XOR<UserUpdateWithoutBatchFacultyAssignmentsInput, UserUncheckedUpdateWithoutBatchFacultyAssignmentsInput>
    create: XOR<UserCreateWithoutBatchFacultyAssignmentsInput, UserUncheckedCreateWithoutBatchFacultyAssignmentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutBatchFacultyAssignmentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutBatchFacultyAssignmentsInput, UserUncheckedUpdateWithoutBatchFacultyAssignmentsInput>
  }

  export type UserUpdateWithoutBatchFacultyAssignmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUpdateManyWithoutUserNestedInput
    passwordResetTokens?: PasswordResetTokenUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutBatchFacultyAssignmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userCode?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    active?: BoolFieldUpdateOperationsInput | boolean
    passwordHash?: StringFieldUpdateOperationsInput | string
    passwordChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenVersion?: IntFieldUpdateOperationsInput | number
    failedLoginCount?: IntFieldUpdateOperationsInput | number
    failedLoginWindowExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lockedUntil?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLogoutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    lastLoginUserAgent?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    loginEvents?: LoginEventUncheckedUpdateManyWithoutUserNestedInput
    passwordResetTokens?: PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput
  }

  export type CourseCreateWithoutStatusHistoryInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleCreateNestedManyWithoutCourseInput
    batches?: BatchCreateNestedManyWithoutCourseInput
    students?: StudentProfileCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutStatusHistoryInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleUncheckedCreateNestedManyWithoutCourseInput
    batches?: BatchUncheckedCreateNestedManyWithoutCourseInput
    students?: StudentProfileUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutStatusHistoryInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutStatusHistoryInput, CourseUncheckedCreateWithoutStatusHistoryInput>
  }

  export type CourseUpsertWithoutStatusHistoryInput = {
    update: XOR<CourseUpdateWithoutStatusHistoryInput, CourseUncheckedUpdateWithoutStatusHistoryInput>
    create: XOR<CourseCreateWithoutStatusHistoryInput, CourseUncheckedCreateWithoutStatusHistoryInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutStatusHistoryInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutStatusHistoryInput, CourseUncheckedUpdateWithoutStatusHistoryInput>
  }

  export type CourseUpdateWithoutStatusHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUpdateManyWithoutCourseNestedInput
    batches?: BatchUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutStatusHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUncheckedUpdateManyWithoutCourseNestedInput
    batches?: BatchUncheckedUpdateManyWithoutCourseNestedInput
    students?: StudentProfileUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type BatchCreateWithoutStatusHistoryInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutBatchesInput
    facultyAssignments?: BatchFacultyAssignmentCreateNestedManyWithoutBatchInput
  }

  export type BatchUncheckedCreateWithoutStatusHistoryInput = {
    id?: string
    courseId: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedCreateNestedManyWithoutBatchInput
  }

  export type BatchCreateOrConnectWithoutStatusHistoryInput = {
    where: BatchWhereUniqueInput
    create: XOR<BatchCreateWithoutStatusHistoryInput, BatchUncheckedCreateWithoutStatusHistoryInput>
  }

  export type BatchUpsertWithoutStatusHistoryInput = {
    update: XOR<BatchUpdateWithoutStatusHistoryInput, BatchUncheckedUpdateWithoutStatusHistoryInput>
    create: XOR<BatchCreateWithoutStatusHistoryInput, BatchUncheckedCreateWithoutStatusHistoryInput>
    where?: BatchWhereInput
  }

  export type BatchUpdateToOneWithWhereWithoutStatusHistoryInput = {
    where?: BatchWhereInput
    data: XOR<BatchUpdateWithoutStatusHistoryInput, BatchUncheckedUpdateWithoutStatusHistoryInput>
  }

  export type BatchUpdateWithoutStatusHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutBatchesNestedInput
    facultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutBatchNestedInput
  }

  export type BatchUncheckedUpdateWithoutStatusHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchNestedInput
  }

  export type CourseCreateWithoutStudentsInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleCreateNestedManyWithoutCourseInput
    batches?: BatchCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutStudentsInput = {
    id?: string
    name: string
    nameKey: string
    description?: string | null
    feeReference?: string | null
    mode: string
    duration?: number | null
    hours?: number | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installmentCount?: number
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    modules?: CourseModuleUncheckedCreateNestedManyWithoutCourseInput
    batches?: BatchUncheckedCreateNestedManyWithoutCourseInput
    statusHistory?: CourseStatusHistoryUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutStudentsInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutStudentsInput, CourseUncheckedCreateWithoutStudentsInput>
  }

  export type CourseUpsertWithoutStudentsInput = {
    update: XOR<CourseUpdateWithoutStudentsInput, CourseUncheckedUpdateWithoutStudentsInput>
    create: XOR<CourseCreateWithoutStudentsInput, CourseUncheckedCreateWithoutStudentsInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutStudentsInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutStudentsInput, CourseUncheckedUpdateWithoutStudentsInput>
  }

  export type CourseUpdateWithoutStudentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUpdateManyWithoutCourseNestedInput
    batches?: BatchUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutStudentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    feeReference?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    hours?: NullableIntFieldUpdateOperationsInput | number | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installmentCount?: IntFieldUpdateOperationsInput | number
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    modules?: CourseModuleUncheckedUpdateManyWithoutCourseNestedInput
    batches?: BatchUncheckedUpdateManyWithoutCourseNestedInput
    statusHistory?: CourseStatusHistoryUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type LoginEventCreateManyUserInput = {
    id?: string
    eventType: $Enums.LoginEventType
    success?: boolean
    ipAddress?: string | null
    userAgent?: string | null
    reason?: string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PasswordResetTokenCreateManyUserInput = {
    id?: string
    tokenHash: string
    expiresAt: Date | string
    usedAt?: Date | string | null
    createdBy?: string | null
    createdAt?: Date | string
  }

  export type BatchFacultyAssignmentCreateManyFacultyInput = {
    id?: string
    batchId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LoginEventUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LoginEventUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LoginEventUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: EnumLoginEventTypeFieldUpdateOperationsInput | $Enums.LoginEventType
    success?: BoolFieldUpdateOperationsInput | boolean
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    meta?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PasswordResetTokenUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    tokenHash?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentUpdateWithoutFacultyInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    batch?: BatchUpdateOneRequiredWithoutFacultyAssignmentsNestedInput
  }

  export type BatchFacultyAssignmentUncheckedUpdateWithoutFacultyInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentUncheckedUpdateManyWithoutFacultyInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleCreateManyCourseInput = {
    id?: string
    title: string
    titleKey: string
    description?: string | null
    sequenceNo: number
    status?: $Enums.RecordStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchCreateManyCourseInput = {
    id?: string
    batchName: string
    batchNameKey: string
    description?: string | null
    startDate: string
    endDate: string
    startTime: string
    endTime: string
    capacity: number
    enrolledCount?: number
    status?: $Enums.BatchStatus
    statusChangedAt?: Date | string | null
    statusChangedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type StudentProfileCreateManyCourseInput = {
    id?: string
    studentCode: string
    studentName: string
    mobileNumber: string
    emailAddress: string
    parentSpouseNumber?: string | null
    location?: string | null
    courseInterested: string
    facultyName?: string | null
    batchName?: string | null
    qualification?: string | null
    passedOutYear?: number | null
    currentStatus?: string | null
    designation?: string | null
    source?: string | null
    actualFees?: number | null
    registrationFees?: number | null
    discount?: number | null
    afterDiscount?: number | null
    installment1?: number | null
    installment2?: number | null
    installment3?: number | null
    totalAmount?: number | null
    admissionDate: string
    firstInstallmentAmount?: number | null
    firstInstallmentDate?: string | null
    firstInstallmentStatus?: string
    firstInstallmentPaidAt?: string | null
    secondInstallmentAmount?: number | null
    secondDueDate?: string | null
    secondInstallmentStatus?: string
    secondInstallmentPaidAt?: string | null
    remarks?: string | null
    recordStatus?: $Enums.RecordStatus
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseStatusHistoryCreateManyCourseInput = {
    id?: string
    fromStatus?: $Enums.RecordStatus | null
    toStatus: $Enums.RecordStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type CourseModuleUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseModuleUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    titleKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    sequenceNo?: IntFieldUpdateOperationsInput | number
    status?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    facultyAssignments?: BatchFacultyAssignmentUpdateManyWithoutBatchNestedInput
    statusHistory?: BatchStatusHistoryUpdateManyWithoutBatchNestedInput
  }

  export type BatchUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    facultyAssignments?: BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchNestedInput
    statusHistory?: BatchStatusHistoryUncheckedUpdateManyWithoutBatchNestedInput
  }

  export type BatchUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    batchName?: StringFieldUpdateOperationsInput | string
    batchNameKey?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: StringFieldUpdateOperationsInput | string
    endDate?: StringFieldUpdateOperationsInput | string
    startTime?: StringFieldUpdateOperationsInput | string
    endTime?: StringFieldUpdateOperationsInput | string
    capacity?: IntFieldUpdateOperationsInput | number
    enrolledCount?: IntFieldUpdateOperationsInput | number
    status?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    statusChangedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusChangedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StudentProfileUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentCode?: StringFieldUpdateOperationsInput | string
    studentName?: StringFieldUpdateOperationsInput | string
    mobileNumber?: StringFieldUpdateOperationsInput | string
    emailAddress?: StringFieldUpdateOperationsInput | string
    parentSpouseNumber?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    courseInterested?: StringFieldUpdateOperationsInput | string
    facultyName?: NullableStringFieldUpdateOperationsInput | string | null
    batchName?: NullableStringFieldUpdateOperationsInput | string | null
    qualification?: NullableStringFieldUpdateOperationsInput | string | null
    passedOutYear?: NullableIntFieldUpdateOperationsInput | number | null
    currentStatus?: NullableStringFieldUpdateOperationsInput | string | null
    designation?: NullableStringFieldUpdateOperationsInput | string | null
    source?: NullableStringFieldUpdateOperationsInput | string | null
    actualFees?: NullableIntFieldUpdateOperationsInput | number | null
    registrationFees?: NullableIntFieldUpdateOperationsInput | number | null
    discount?: NullableIntFieldUpdateOperationsInput | number | null
    afterDiscount?: NullableIntFieldUpdateOperationsInput | number | null
    installment1?: NullableIntFieldUpdateOperationsInput | number | null
    installment2?: NullableIntFieldUpdateOperationsInput | number | null
    installment3?: NullableIntFieldUpdateOperationsInput | number | null
    totalAmount?: NullableIntFieldUpdateOperationsInput | number | null
    admissionDate?: StringFieldUpdateOperationsInput | string
    firstInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    firstInstallmentDate?: NullableStringFieldUpdateOperationsInput | string | null
    firstInstallmentStatus?: StringFieldUpdateOperationsInput | string
    firstInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentAmount?: NullableIntFieldUpdateOperationsInput | number | null
    secondDueDate?: NullableStringFieldUpdateOperationsInput | string | null
    secondInstallmentStatus?: StringFieldUpdateOperationsInput | string
    secondInstallmentPaidAt?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    recordStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseStatusHistoryUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus | null
    toStatus?: EnumRecordStatusFieldUpdateOperationsInput | $Enums.RecordStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentCreateManyBatchInput = {
    id?: string
    facultyId: string
    assignedDate: string
    assignedAt?: Date | string
    releasedAt?: Date | string | null
    status?: $Enums.AssignmentStatus
    notes?: string | null
    assignedBy?: string | null
    releasedBy?: string | null
    createdBy?: string | null
    updatedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BatchStatusHistoryCreateManyBatchInput = {
    id?: string
    fromStatus?: $Enums.BatchStatus | null
    toStatus: $Enums.BatchStatus
    changedBy?: string | null
    reason?: string | null
    changedAt?: Date | string
  }

  export type BatchFacultyAssignmentUpdateWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    faculty?: UserUpdateOneRequiredWithoutBatchFacultyAssignmentsNestedInput
  }

  export type BatchFacultyAssignmentUncheckedUpdateWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    facultyId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchFacultyAssignmentUncheckedUpdateManyWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    facultyId?: StringFieldUpdateOperationsInput | string
    assignedDate?: StringFieldUpdateOperationsInput | string
    assignedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    releasedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumAssignmentStatusFieldUpdateOperationsInput | $Enums.AssignmentStatus
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    assignedBy?: NullableStringFieldUpdateOperationsInput | string | null
    releasedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryUpdateWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryUncheckedUpdateWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BatchStatusHistoryUncheckedUpdateManyWithoutBatchInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromStatus?: NullableEnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus | null
    toStatus?: EnumBatchStatusFieldUpdateOperationsInput | $Enums.BatchStatus
    changedBy?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    changedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}