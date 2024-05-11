import type {
  FilterArrayByValue,
  PickDefined,
  NeverIfEmpty,
  UndefinedToOptional,
  PathParamNames,
  TransitiveOptional,
  ReadonlyDeep,
  Merge,
  FilterArrayByKey,
  IfEquals,
  RequiredKeys,
  ArrayFindByValue,
} from "./utils.types";
import type {
  AnyZodmonTypeProvider,
  InferInputTypeFromSchema,
  InferOutputTypeFromSchema,
  ZodmonRuntimeTypeProvider,
  ZodTypeProvider,
} from "./type-providers";
import {
  AnyZodmonFetcherProvider,
  TypeOfFetcherConfig,
  TypeOfFetcherError,
  TypeOfFetcherResponse,
  ZodmonFetcherFactory,
} from "./fetcher-providers";

export const HTTP_QUERY_METHODS = ["get", "head"] as const;
export const HTTP_MUTATION_METHODS = [
  "post",
  "put",
  "patch",
  "delete",
] as const;
export const HTTP_METHODS = [
  ...HTTP_QUERY_METHODS,
  ...HTTP_MUTATION_METHODS,
] as const;

export type QueryMethod = (typeof HTTP_QUERY_METHODS)[number];
export type MutationMethod = (typeof HTTP_MUTATION_METHODS)[number];
export type Method = (typeof HTTP_METHODS)[number];

export type RequestFormat =
  | "json" // default
  | "form-data" // for file uploads
  | "form-url" // for hiding query params in the body
  | "binary" // for binary data / file uploads
  | "text"; // for text data

type EndpointDefinitionsByMethod<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method
> = FilterArrayByValue<Api, { method: M }>;

export type FindZodmonEndpointDefinitionByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>
> = ArrayFindByValue<Api, { method: M; path: Path }>;

export type FindZodmonEndpointDefinitionByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string
> = ArrayFindByValue<Api, { alias: Alias }>;

export type ZodmonPathsByMethod<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method
> = EndpointDefinitionsByMethod<Api, M>[number]["path"];

export type Aliases<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[]
> = FilterArrayByKey<Api, "alias">[number]["alias"];

export type ZodmonResponseForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<TypeProvider, Endpoint["response"]>
  : InferInputTypeFromSchema<TypeProvider, Endpoint["response"]>;

export type ZodmonResponseByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByPath<Api, M, Path>["response"]
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByPath<Api, M, Path>["response"]
    >;

export type ZodmonResponseByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByAlias<Api, Alias>["response"]
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByAlias<Api, Alias>["response"]
    >;

export type ZodmonDefaultErrorForEndpoint<
  Endpoint extends ZodmonEndpointDefinition
> = FilterArrayByValue<
  Endpoint["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type ZodmonDefaultErrorByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>
> = FilterArrayByValue<
  FindZodmonEndpointDefinitionByPath<Api, M, Path>["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type ZodmonDefaultErrorByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string
> = FilterArrayByValue<
  FindZodmonEndpointDefinitionByAlias<Api, Alias>["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type IfNever<E, A> = IfEquals<E, never, A, E>;

export type ZodmonErrorForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Status extends number,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          Endpoint["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorForEndpoint<Endpoint>
      >
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          Endpoint["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorForEndpoint<Endpoint>
      >
    >;

export type ZodmonErrorByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Status extends number | "default",
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          FindZodmonEndpointDefinitionByPath<Api, M, Path>["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorByPath<Api, M, Path>
      >
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          FindZodmonEndpointDefinitionByPath<Api, M, Path>["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorByPath<Api, M, Path>
      >
    >;

export type ZodmonErrorsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByPath<
        Api,
        M,
        Path
      >["errors"][number]["schema"]
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByPath<
        Api,
        M,
        Path
      >["errors"][number]["schema"]
    >;

export type ZodmonErrorsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByAlias<Api, Path>["errors"]
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      FindZodmonEndpointDefinitionByAlias<Api, Path>["errors"]
    >;

export type InferFetcherErrors<
  T extends readonly unknown[] | unknown[],
  TypeProvider extends AnyZodmonTypeProvider,
  FetcherProvider extends AnyZodmonFetcherProvider,
  Acc extends unknown[] = []
> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends {
      status: infer Status;
      schema: infer Schema;
    }
    ? InferFetcherErrors<
        Tail,
        TypeProvider,
        FetcherProvider,
        [
          ...Acc,
          TypeOfFetcherError<
            FetcherProvider,
            InferOutputTypeFromSchema<TypeProvider, Schema>,
            Status
          >
        ]
      >
    : Acc
  : T extends [infer Head, ...infer Tail]
  ? Head extends {
      status: infer Status;
      schema: infer Schema;
    }
    ? InferFetcherErrors<
        Tail,
        TypeProvider,
        FetcherProvider,
        [
          ...Acc,
          TypeOfFetcherError<
            FetcherProvider,
            InferOutputTypeFromSchema<TypeProvider, Schema>,
            Status
          >
        ]
      >
    : Acc
  : Acc;

export type ZodmonMatchingErrorsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = InferFetcherErrors<
  FindZodmonEndpointDefinitionByPath<Api, M, Path>["errors"],
  TypeProvider,
  FetcherProvider
>[number];

export type ZodmonMatchingErrorsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = InferFetcherErrors<
  FindZodmonEndpointDefinitionByAlias<Api, Alias>["errors"],
  TypeProvider,
  FetcherProvider
>[number];

export type ZodmonErrorByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Status extends number | "default",
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferOutputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          FindZodmonEndpointDefinitionByAlias<Api, Alias>["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorByAlias<Api, Alias>
      >
    >
  : InferInputTypeFromSchema<
      TypeProvider,
      IfNever<
        FilterArrayByValue<
          FindZodmonEndpointDefinitionByAlias<Api, Alias>["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodmonDefaultErrorByAlias<Api, Alias>
      >
    >;

type BodySchemaForEndpoint<Endpoint extends ZodmonEndpointDefinition> =
  ArrayFindByValue<Endpoint["parameters"], { type: "Body" }>["schema"];

type BodySchema<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>
> = ArrayFindByValue<
  FindZodmonEndpointDefinitionByPath<Api, M, Path>["parameters"],
  { type: "Body" }
>["schema"];

export type ZodmonBodyForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferInputTypeFromSchema<TypeProvider, BodySchemaForEndpoint<Endpoint>>
  : InferOutputTypeFromSchema<TypeProvider, BodySchemaForEndpoint<Endpoint>>;

export type ZodmonBodyByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferInputTypeFromSchema<TypeProvider, BodySchema<Api, M, Path>>
  : InferOutputTypeFromSchema<TypeProvider, BodySchema<Api, M, Path>>;

export type BodySchemaByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string
> = ArrayFindByValue<
  FindZodmonEndpointDefinitionByAlias<Api, Alias>["parameters"],
  { type: "Body" }
>["schema"];

export type ZodmonBodyByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Frontend extends true
  ? InferInputTypeFromSchema<TypeProvider, BodySchemaByAlias<Api, Alias>>
  : InferOutputTypeFromSchema<TypeProvider, BodySchemaByAlias<Api, Alias>>;

/**
 * Map a type an api description parameter to a zod infer type
 * @param T - array of api description parameters
 * @details -  this is using tail recursion type optimization from typescript 4.5
 */
export type MapSchemaParameters<
  T,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider,
  Acc = {}
> = T extends [infer Head, ...infer Tail]
  ? Head extends {
      name: infer Name;
      schema: infer Schema;
    }
    ? Name extends string
      ? MapSchemaParameters<
          Tail,
          Frontend,
          TypeProvider,
          Merge<
            {
              [Key in Name]: Frontend extends true
                ? InferInputTypeFromSchema<TypeProvider, Schema>
                : InferOutputTypeFromSchema<TypeProvider, Schema>;
            },
            Acc
          >
        >
      : Acc
    : Acc
  : Acc;

export type ZodmonQueryParamsForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<Endpoint["parameters"], { type: "Query" }>,
      Frontend,
      TypeProvider
    >
  >
>;

export type ZodmonQueryParamsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        FindZodmonEndpointDefinitionByPath<Api, M, Path>["parameters"],
        { type: "Query" }
      >,
      Frontend,
      TypeProvider
    >
  >
>;

export type ZodmonQueryParamsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        FindZodmonEndpointDefinitionByAlias<Api, Alias>["parameters"],
        { type: "Query" }
      >,
      Frontend,
      TypeProvider
    >
  >
>;

/**
 * @deprecated - use ZodmonQueryParamsByPath instead
 */
export type ZodmonPathParams<Path extends string> = NeverIfEmpty<
  Record<PathParamNames<Path>, string | number>
>;

export type ZodmonPathParamsForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider,
  PathParameters = MapSchemaParameters<
    FilterArrayByValue<Endpoint["parameters"], { type: "Path" }>,
    Frontend,
    TypeProvider
  >,
  Path = Endpoint["path"],
  $PathParamNames extends string = PathParamNames<Path>
> = NeverIfEmpty<
  {
    [K in $PathParamNames]: string | number | boolean;
  } & PathParameters
>;

/**
 * Get path params for a given endpoint by path
 */
export type ZodmonPathParamsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider,
  PathParameters = MapSchemaParameters<
    FilterArrayByValue<
      FindZodmonEndpointDefinitionByPath<Api, M, Path>["parameters"],
      { type: "Path" }
    >,
    Frontend,
    TypeProvider
  >,
  $PathParamNames extends string = PathParamNames<Path>
> = NeverIfEmpty<
  {
    [K in $PathParamNames]: string | number | boolean;
  } & PathParameters
>;

/**
 * Get path params for a given endpoint by alias
 */
export type ZodmonPathParamByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider,
  Endpoint extends ZodmonEndpointDefinition = FindZodmonEndpointDefinitionByAlias<
    Api,
    Alias
  >,
  Path = Endpoint["path"],
  PathParameters = MapSchemaParameters<
    FilterArrayByValue<Endpoint["parameters"], { type: "Path" }>,
    Frontend,
    TypeProvider
  >,
  $PathParamNames extends string = PathParamNames<Path>
> = NeverIfEmpty<
  {
    [K in $PathParamNames]: string | number | boolean;
  } & PathParameters
>;

export type ZodmonHeaderParamsForEndpoint<
  Endpoint extends ZodmonEndpointDefinition,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<Endpoint["parameters"], { type: "Header" }>,
      Frontend,
      TypeProvider
    >
  >
>;

export type ZodmonHeaderParamsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        FindZodmonEndpointDefinitionByPath<Api, M, Path>["parameters"],
        { type: "Header" }
      >,
      Frontend,
      TypeProvider
    >
  >
>;

export type ZodmonHeaderParamsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        FindZodmonEndpointDefinitionByAlias<Api, Alias>["parameters"],
        { type: "Header" }
      >,
      Frontend,
      TypeProvider
    >
  >
>;

export type ZodmonRequestOptionsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  FetcherProvider extends AnyZodmonFetcherProvider,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Merge<
  TypeOfFetcherConfig<FetcherProvider>,
  TransitiveOptional<
    PickDefined<{
      params: ZodmonPathParamByAlias<Api, Alias, Frontend, TypeProvider>;
      queries: ZodmonQueryParamsByAlias<Api, Alias, Frontend, TypeProvider>;
      headers: ZodmonHeaderParamsByAlias<Api, Alias, Frontend, TypeProvider>;
      body: ZodmonBodyByAlias<Api, Alias, Frontend, TypeProvider>;
    }>
  >
>;

export type ZodmonAliasRequest<Config, Response> =
  RequiredKeys<Config> extends never
    ? (configOptions?: ReadonlyDeep<Config>) => Promise<Response>
    : (configOptions: ReadonlyDeep<Config>) => Promise<Response>;

export type ZodmonAliases<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = {
  [Alias in Aliases<Api>]: ZodmonAliasRequest<
    ZodmonRequestOptionsByAlias<
      Api,
      Alias,
      FetcherProvider,
      true,
      TypeProvider
    >,
    ZodmonResponseByAlias<Api, Alias, true, TypeProvider>
  >;
};

type OptionalRequestOptionsByPathParameters<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider,
  Config = ZodmonRequestOptionsByPath<
    Api,
    M,
    Path,
    FetcherProvider,
    true,
    TypeProvider
  >
> = RequiredKeys<Config> extends never
  ? [config?: ReadonlyDeep<Config>]
  : [config: ReadonlyDeep<Config>];

export type ZodmonVerbs<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = {
  [M in Method]: <Path extends ZodmonPathsByMethod<Api, M>>(
    path: Path,
    ...params: OptionalRequestOptionsByPathParameters<
      Api,
      M,
      Path,
      FetcherProvider,
      TypeProvider
    >
  ) => Promise<ZodmonResponseByPath<Api, M, Path, true, TypeProvider>>;
};

export type AnyZodmonMethodOptions<
  FetcherProvider extends AnyZodmonFetcherProvider
> = Merge<
  TypeOfFetcherConfig<FetcherProvider>,
  {
    params?: Record<string, unknown>;
    queries?: Record<string, unknown>;
    headers?: Record<string, string>;
    body?: unknown;
  }
>;

export type AnyZodmonRequestOptions<
  FetcherProvider extends AnyZodmonFetcherProvider
> = Merge<
  { method: Method; url: string },
  AnyZodmonMethodOptions<FetcherProvider>
>;

/**
 * Get the request options for a given endpoint
 */
export type ZodmonRequestOptionsByPath<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  FetcherProvider extends AnyZodmonFetcherProvider,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Merge<
  TypeOfFetcherConfig<FetcherProvider>,
  TransitiveOptional<
    PickDefined<{
      params: ZodmonPathParamsByPath<Api, M, Path, Frontend, TypeProvider>;
      queries: ZodmonQueryParamsByPath<Api, M, Path, Frontend, TypeProvider>;
      headers: ZodmonHeaderParamsByPath<Api, M, Path, Frontend, TypeProvider>;
      body: ZodmonBodyByPath<Api, M, Path, Frontend, TypeProvider>;
    }>
  >
>;

export type ZodmonRequestOptions<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  FetcherProvider extends AnyZodmonFetcherProvider,
  Frontend extends boolean = true,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> = Merge<
  {
    method: M;
    url: Path;
  },
  ZodmonRequestOptionsByPath<
    Api,
    M,
    Path,
    FetcherProvider,
    Frontend,
    TypeProvider
  >
>;

/**
 * Zodmon options
 */
export interface ZodmonOptions<
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> {
  /**
   * Should zodmon validate parameters and response? Default: true
   */
  validate?: boolean | "request" | "response" | "all" | "none";
  /**
   * Should zodmon transform the request and response ? Default: true
   */
  transform?: boolean | "request" | "response";
  /**
   * Should zod schema default values be used on parameters? Default: false
   * you usually want your backend to handle default values
   */
  sendDefaults?: boolean;

  /**
   * Should zodmon throw on error? Default: true
   * if false, zodmon will return the error in the response else it will throw
   */
  throwOnError?: boolean;

  fetcherFactory?: ZodmonFetcherFactory<FetcherProvider>;

  /**
   * set a custom type provider. Default: ZodTypeProvider
   */
  typeProvider?: ZodmonRuntimeTypeProvider<TypeProvider>;
}

export interface ZodmonEndpointParameter<BaseSchemaType = unknown> {
  /**
   * name of the parameter
   */
  name: string;
  /**
   * optional description of the parameter
   */
  description?: string;
  /**
   * type of the parameter: Query, Body, Header, Path
   */
  type: "Query" | "Body" | "Header" | "Path";
  /**
   * zod schema of the parameter
   * you can use zod `transform` to transform the value of the parameter before sending it to the server
   */
  schema: BaseSchemaType;
}

export interface ZodmonEndpointError<BaseSchemaType = unknown> {
  /**
   * status code of the error
   * use 'default' to declare a default error
   */
  status: number | "default";
  /**
   * description of the error - used to generate the openapi error description
   */
  description?: string;
  /**
   * schema of the error
   */
  schema: BaseSchemaType;
}

/**
 * Zodmon enpoint definition that should be used to create a new instance of Zodmon
 */
export interface ZodmonEndpointDefinition<BaseSchemaType = unknown> {
  /**
   * http method : get, post, put, patch, delete
   */
  method: Method;
  /**
   * path of the endpoint
   * @example
   * ```text
   * /posts/:postId/comments/:commentId
   * ```
   */
  path: string;
  /**
   * optional alias to call the endpoint easily
   * @example
   * ```text
   * getPostComments
   * ```
   */
  alias?: string;
  /**
   * optional description of the endpoint
   */
  description?: string;
  /**
   * optional request format of the endpoint: json, form-data, form-url, binary, text
   */
  requestFormat?: RequestFormat;
  /**
   * optionally mark the endpoint as immutable to allow zodmon to cache the response with react-query
   * use it to mark a 'post' endpoint as immutable
   */
  immutable?: boolean;
  /**
   * optional parameters of the endpoint
   */
  parameters?:
    | readonly ZodmonEndpointParameter<BaseSchemaType>[]
    | ZodmonEndpointParameter<BaseSchemaType>[];
  /**
   * response of the endpoint
   * you can use zod `transform` to transform the value of the response before returning it
   */
  response: BaseSchemaType;
  /**
   * optional response status of the endpoint for sucess, default is 200
   * customize it if your endpoint returns a different status code and if you need openapi to generate the correct status code
   */
  status?: number;
  /**
   * optional response description of the endpoint
   */
  responseDescription?: string;
  /**
   * optional errors of the endpoint - only usefull when using @zodmon/express
   */
  errors?:
    | readonly ZodmonEndpointError<BaseSchemaType>[]
    | ZodmonEndpointError<BaseSchemaType>[];
}

/**
 * Zodmon plugin that can be used to intercept zodmon requests and responses
 */
export interface ZodmonPlugin<
  FetcherProvider extends AnyZodmonFetcherProvider
> {
  /**
   * Optional name of the plugin
   * naming a plugin allows to remove it or replace it later
   */
  name?: string;
  /**
   * request interceptor to modify or inspect the request before it is sent
   * @param api - the api description
   * @param request - the request config
   * @returns possibly a new request config
   */
  request?: (
    endpoint: ZodmonEndpointDefinition,
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>
  ) => Promise<ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>>;
  /**
   * response interceptor to modify or inspect the response before it is returned
   * @param api - the api description
   * @param config - the request config
   * @param response - the response
   * @returns possibly a new response
   */
  response?: (
    endpoint: ZodmonEndpointDefinition,
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>,
    response: TypeOfFetcherResponse<FetcherProvider>
  ) => Promise<TypeOfFetcherResponse<FetcherProvider>>;
  /**
   * error interceptor for response errors
   * there is no error interceptor for request errors
   * @param api - the api description
   * @param config - the config for the request
   * @param error - the error that occured
   * @returns possibly a new response or a new error
   */
  error?: (
    endpoint: ZodmonEndpointDefinition,
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>,
    error: Error
  ) => Promise<TypeOfFetcherResponse<FetcherProvider>>;
}
