import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  useQueryClient,
  QueryFunctionContext,
  QueryKey,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import {
  ZodmonError,
  HTTP_MUTATION_METHODS,
  FindZodmonEndpointDefinitionByAlias,
} from "@zodmon/core";
import type {
  AnyZodmonFetcherProvider,
  AnyZodmonMethodOptions,
  AnyZodmonTypeProvider,
  Method,
  ZodmonInstance,
  ZodmonPathsByMethod,
  ZodmonResponseByPath,
  ZodmonResponseByAlias,
  ZodmonEndpointDefinition,
  ZodmonRequestOptionsByPath,
  ZodmonBodyByPath,
  ZodmonBodyByAlias,
  ZodmonQueryParamsByPath,
  ZodmonRequestOptionsByAlias,
  ZodTypeProvider,
} from "@zodmon/core";
import type {
  IfEquals,
  PathParamNames,
  ReadonlyDeep,
  RequiredKeys,
} from "@zodmon/core/lib/utils.types";
import type { Aliases, MutationMethod } from "@zodmon/core/lib/zodmon.types";
import { capitalize, pick, omit, hasObjectBody, combineSignals } from "./utils";

type UndefinedIfNever<T> = IfEquals<T, never, undefined, T>;
type Errors = Error | ZodmonError;

type MutationOptions<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  M extends Method,
  Path extends ZodmonPathsByMethod<Api, M>,
  TypeProvider extends AnyZodmonTypeProvider
> = Omit<
  UseMutationOptions<
    Awaited<ZodmonResponseByPath<Api, M, Path, true, TypeProvider>>,
    Errors,
    UndefinedIfNever<ZodmonBodyByPath<Api, M, Path, true, TypeProvider>>
  >,
  "mutationFn" | "mutationKey"
>;

type MutationOptionsByAlias<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  Alias extends string,
  TypeProvider extends AnyZodmonTypeProvider
> = Omit<
  UseMutationOptions<
    Awaited<ZodmonResponseByAlias<Api, Alias, true, TypeProvider>>,
    Errors,
    UndefinedIfNever<ZodmonBodyByAlias<Api, Alias, true, TypeProvider>>
  >,
  "mutationFn"
>;

export type QueryOptions<TQueryFnData, TData> = Omit<
  UseQueryOptions<TQueryFnData, Errors, TData>,
  "queryKey" | "queryFn"
>;

type ImmutableQueryOptions<TQueryFnData, TData> = Omit<
  UseQueryOptions<TQueryFnData, Errors, TData>,
  "queryKey" | "queryFn"
>;

type InfiniteQueryOptions<TQueryFnData, TData> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, Errors, TData>,
  "queryKey" | "queryFn"
>;

export type ImmutableInfiniteQueryOptions<TQueryFnData, TData> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, Errors, TData>,
  "queryKey" | "queryFn"
>;

export class ZodmonHooksImpl<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> {
  constructor(
    private readonly apiName: string,
    private readonly zodmon: ZodmonInstance<Api, FetcherProvider, TypeProvider>,
    private readonly options: { shouldAbortOnUnmount?: boolean } = {}
  ) {
    this.injectAliasEndpoints();
    this.injectMutationEndpoints();
  }

  private injectAliasEndpoints() {
    this.zodmon.api.forEach((endpoint) => {
      if (endpoint.alias) {
        if (["post", "put", "patch", "delete"].includes(endpoint.method)) {
          if (endpoint.method === "post" && endpoint.immutable) {
            (this as any)[`use${capitalize(endpoint.alias)}`] = (
              config: any,
              mutationOptions: any
            ) =>
              this.useImmutableQuery(
                endpoint.path as any,
                config,
                mutationOptions
              );
          } else {
            (this as any)[`use${capitalize(endpoint.alias)}`] = (
              config: any,
              mutationOptions: any
            ) =>
              this.useMutation(
                // @ts-expect-error
                endpoint.method,
                endpoint.path as any,
                config,
                mutationOptions
              );
          }
        } else {
          (this as any)[`use${capitalize(endpoint.alias)}`] = (
            config: any,
            queryOptions: any
          ) => this.useQuery(endpoint.path as any, config, queryOptions);
        }
      }
    });
  }

  private injectMutationEndpoints() {
    HTTP_MUTATION_METHODS.forEach((method) => {
      (this as any)[`use${capitalize(method)}`] = (
        path: any,
        config: any,
        mutationOptions: any
        // @ts-expect-error
      ) => this.useMutation(method, path, config, mutationOptions);
    });
  }

  private getEndpointByPath(method: string, path: string) {
    return this.zodmon.api.find(
      (endpoint) => endpoint.method === method && endpoint.path === path
    );
  }

  private getEndpointByAlias(alias: string) {
    return this.zodmon.api.find((endpoint) => endpoint.alias === alias);
  }

  /**
   * compute the key for the provided endpoint
   * @param method - HTTP method of the endpoint
   * @param path - path for the endpoint
   * @param config - parameters of the api to the endpoint - when providing no parameters, will return the common key for the endpoint
   * @returns - Key
   */
  getKeyByPath<M extends Method, Path extends ZodmonPathsByMethod<Api, Method>>(
    method: M,
    path: Path extends ZodmonPathsByMethod<Api, M> ? Path : never,
    config?: ZodmonRequestOptionsByPath<
      Api,
      M,
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  ) {
    const endpoint = this.getEndpointByPath(method, path);
    if (!endpoint)
      throw new Error(`No endpoint found for path '${method} ${path}'`);
    if (config) {
      const params = pick(
        config as AnyZodmonMethodOptions<FetcherProvider> | undefined,
        ["params", "queries", "body"]
      );
      if (Object.keys(params).length > 0)
        return [this.apiName, endpoint.path, params] as QueryKey;
    }
    return [this.apiName, endpoint.path] as QueryKey;
  }

  /**
   * compute the key for the provided endpoint alias
   * @param alias - alias of the endpoint
   * @param config - parameters of the api to the endpoint
   * @returns - QueryKey
   */
  getKeyByAlias<Alias extends Aliases<Api>>(
    alias: Alias extends string ? Alias : never,
    config?: Alias extends string
      ? ZodmonRequestOptionsByAlias<
          Api,
          Alias,
          FetcherProvider,
          true,
          TypeProvider
        >
      : never
  ) {
    const endpoint = this.getEndpointByAlias(alias);
    if (!endpoint) throw new Error(`No endpoint found for alias '${alias}'`);
    if (config) {
      const params = pick(
        config as AnyZodmonMethodOptions<FetcherProvider> | undefined,
        ["params", "queries", "body"]
      );
      if (Object.keys(params).length > 0)
        return [this.apiName, endpoint.path, params] as QueryKey;
    }
    return [this.apiName, endpoint.path] as QueryKey;
  }

  useQuery<
    Path extends ZodmonPathsByMethod<Api, "get">,
    TConfig extends ZodmonRequestOptionsByPath<
      Api,
      "get",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >,
    TQueryFnData = ZodmonResponseByPath<Api, "get", Path, true, TypeProvider>,
    TData = TQueryFnData
  >(
    path: Path,
    ...[config, queryOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          queryOptions?: QueryOptions<TQueryFnData, TData>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          queryOptions?: QueryOptions<TQueryFnData, TData>
        ]
  ): UseQueryResult<TData, Errors> & {
    invalidate: () => Promise<void>;
    key: QueryKey;
  } {
    const key = this.getKeyByPath("get", path, config as any);
    const query = (queryParams: QueryFunctionContext) =>
      this.zodmon.get(path, {
        ...(config as any),
        signal: this.options.shouldAbortOnUnmount
          ? combineSignals(queryParams.signal, (config as any)?.signal)
          : (config as any)?.signal,
      });
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries(key);
    return {
      invalidate,
      key,
      // @ts-expect-error
      ...useQuery(key, query, queryOptions),
    };
  }

  useImmutableQuery<
    Path extends ZodmonPathsByMethod<Api, "post">,
    TConfig extends ZodmonRequestOptionsByPath<
      Api,
      "post",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >,
    TQueryFnData = ZodmonResponseByPath<Api, "post", Path, true, TypeProvider>,
    TData = TQueryFnData
  >(
    path: Path,
    ...[config, queryOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          queryOptions?: ImmutableQueryOptions<TQueryFnData, TData>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          queryOptions?: ImmutableQueryOptions<TQueryFnData, TData>
        ]
  ): UseQueryResult<TData, Errors> & {
    invalidate: () => Promise<void>;
    key: QueryKey;
  } {
    const key = this.getKeyByPath("post", path, config as any);
    const query = (queryParams: QueryFunctionContext) =>
      this.zodmon.post(path, {
        ...(config as any),
        signal: this.options.shouldAbortOnUnmount
          ? combineSignals(queryParams.signal, (config as any)?.signal)
          : (config as any)?.signal,
      });
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries(key);
    return {
      invalidate,
      key,
      ...useQuery(key, query as any, queryOptions),
    };
  }

  useInfiniteQuery<
    Path extends ZodmonPathsByMethod<Api, "get">,
    TConfig extends ZodmonRequestOptionsByPath<
      Api,
      "get",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >,
    TQueryFnData = ZodmonResponseByPath<Api, "get", Path, true, TypeProvider>,
    TData = TQueryFnData,
    TQueryParams = ZodmonQueryParamsByPath<
      Api,
      "get",
      Path,
      true,
      TypeProvider
    > extends never
      ? never
      : keyof ZodmonQueryParamsByPath<Api, "get", Path, true, TypeProvider>
  >(
    path: Path,
    ...[config, queryOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          queryOptions?: InfiniteQueryOptions<TQueryFnData, TData> & {
            getPageParamList: () => (TQueryParams | PathParamNames<Path>)[];
          }
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          queryOptions?: InfiniteQueryOptions<TQueryFnData, TData> & {
            getPageParamList: () => (TQueryParams | PathParamNames<Path>)[];
          }
        ]
  ): UseInfiniteQueryResult<TData, Errors> & {
    invalidate: () => Promise<void>;
    key: QueryKey;
  } {
    const params = pick(
      config as AnyZodmonMethodOptions<FetcherProvider> | undefined,
      ["params", "queries", "body"]
    );
    // istanbul ignore next
    if (params.params && queryOptions) {
      params.params = omit(
        params.params,
        queryOptions.getPageParamList() as string[]
      );
    }
    if (params.queries && queryOptions) {
      params.queries = omit(
        params.queries,
        queryOptions.getPageParamList() as string[]
      );
    }
    // istanbul ignore next
    if (
      params.body &&
      typeof params.body === "object" &&
      !Array.isArray(params.body) &&
      queryOptions
    ) {
      params.body = omit(
        params.body as Record<string, unknown>,
        queryOptions.getPageParamList() as string[]
      );
    }
    const key = [this.apiName, path, params];
    const query = (queryParams: QueryFunctionContext) =>
      this.zodmon.get(path, {
        ...config,
        queries: {
          ...(config as any)?.queries,
          ...queryParams.pageParam?.queries,
        },
        params: {
          ...(config as any)?.params,
          ...queryParams.pageParam?.params,
        },
        body:
          // istanbul ignore next
          hasObjectBody(config)
            ? {
                ...(config as any)?.body,
                ...queryParams.pageParam?.body,
              }
            : (config as any)?.body,
        signal: this.options.shouldAbortOnUnmount
          ? combineSignals(queryParams.signal, (config as any)?.signal)
          : (config as any)?.signal,
      } as unknown as ReadonlyDeep<TConfig>);
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries(key);
    return {
      invalidate,
      key,
      ...useInfiniteQuery(
        key,
        query as any,
        queryOptions as Omit<typeof queryOptions, "getPageParamList">
      ),
    };
  }

  useImmutableInfiniteQuery<
    Path extends ZodmonPathsByMethod<Api, "post">,
    TConfig extends ZodmonRequestOptionsByPath<
      Api,
      "post",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >,
    TQueryFnData = ZodmonResponseByPath<Api, "post", Path, true, TypeProvider>,
    TData = TQueryFnData,
    TQueryParams = ZodmonQueryParamsByPath<
      Api,
      "post",
      Path,
      true,
      TypeProvider
    > extends never
      ? never
      : keyof ZodmonQueryParamsByPath<Api, "post", Path, true, TypeProvider>
  >(
    path: Path,
    ...[config, queryOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          queryOptions?: ImmutableInfiniteQueryOptions<TQueryFnData, TData> & {
            getPageParamList: () => (
              | keyof ZodmonBodyByPath<Api, "post", Path, true, TypeProvider>
              | PathParamNames<Path>
              | TQueryParams
            )[];
          }
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          queryOptions?: ImmutableInfiniteQueryOptions<TQueryFnData, TData> & {
            getPageParamList: () => (
              | keyof ZodmonBodyByPath<Api, "post", Path, true, TypeProvider>
              | PathParamNames<Path>
              | TQueryParams
            )[];
          }
        ]
  ): UseInfiniteQueryResult<TData, Errors> & {
    invalidate: () => Promise<void>;
    key: QueryKey;
  } {
    const params = pick(
      config as AnyZodmonMethodOptions<FetcherProvider> | undefined,
      ["params", "queries", "body"]
    );
    // istanbul ignore next
    if (params.params && queryOptions) {
      params.params = omit(
        params.params,
        queryOptions.getPageParamList() as string[]
      );
    }
    // istanbul ignore next
    if (params.queries && queryOptions) {
      params.queries = omit(
        params.queries,
        queryOptions.getPageParamList() as string[]
      );
    }
    // istanbul ignore next
    if (
      params.body &&
      typeof params.body === "object" &&
      !Array.isArray(params.body) &&
      queryOptions
    ) {
      params.body = omit(
        params.body as Record<string, unknown>,
        queryOptions.getPageParamList() as string[]
      );
    }
    const key = [this.apiName, path, params];
    const query = (queryParams: QueryFunctionContext) =>
      this.zodmon.post(path, {
        ...config,
        queries: {
          ...(config as any)?.queries,
          ...queryParams.pageParam?.queries,
        },
        params: {
          ...(config as any)?.params,
          ...queryParams.pageParam?.params,
        },
        body:
          // istanbul ignore next
          hasObjectBody(config)
            ? {
                ...(config as any)?.body,
                ...queryParams.pageParam?.body,
              }
            : (config as any)?.body,
        signal: this.options.shouldAbortOnUnmount
          ? combineSignals(queryParams.signal, (config as any)?.signal)
          : (config as any)?.signal,
      } as unknown as ReadonlyDeep<TConfig>);
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries(key);
    return {
      invalidate,
      key,
      ...useInfiniteQuery(
        key,
        // @ts-expect-error
        query,
        queryOptions as Omit<typeof queryOptions, "getPageParamList">
      ),
    };
  }

  useMutation<
    Path extends ZodmonPathsByMethod<Api, "get">,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        "get",
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, "get", Path, true, TypeProvider>
    >
  >(
    method: "get",
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "get", Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "get", Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, "get", Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
  useMutation<
    Path extends ZodmonPathsByMethod<Api, "post">,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        "post",
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, "post", Path, true, TypeProvider>
    >
  >(
    method: "post",
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "post", Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "post", Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, "post", Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
  useMutation<
    Path extends ZodmonPathsByMethod<Api, "put">,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        "put",
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, "put", Path, true, TypeProvider>
    >
  >(
    method: "put",
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "put", Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "put", Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, "put", Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
  useMutation<
    Path extends ZodmonPathsByMethod<Api, "patch">,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        "patch",
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, "patch", Path, true, TypeProvider>
    >
  >(
    method: "patch",
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "patch", Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "patch", Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, "patch", Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
  useMutation<
    Path extends ZodmonPathsByMethod<Api, "delete">,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        "delete",
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, "delete", Path, true, TypeProvider>
    >
  >(
    method: "delete",
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "delete", Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, "delete", Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, "delete", Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
  useMutation<
    M extends Method,
    Path extends ZodmonPathsByMethod<Api, M>,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        M,
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, M, Path, true, TypeProvider>
    >
  >(
    method: M,
    path: Path,
    ...[config, mutationOptions]: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, M, Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, M, Path, TypeProvider>
        ]
  ): UseMutationResult<
    ZodmonResponseByPath<Api, M, Path, true, TypeProvider>,
    Errors,
    MutationVariables
  > {
    const mutation = (body: MutationVariables) => {
      return this.zodmon.request({
        ...config,
        method,
        url: path,
        body,
      } as any);
    };
    // @ts-expect-error
    return useMutation(mutation, mutationOptions);
  }

  useGet<
    Path extends ZodmonPathsByMethod<Api, "get">,
    TConfig extends ZodmonRequestOptionsByPath<
      Api,
      "get",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >,
    TQueryFnData = ZodmonResponseByPath<Api, "get", Path, true, TypeProvider>,
    TData = TQueryFnData
  >(
    path: Path,
    ...rest: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          queryOptions?: QueryOptions<TQueryFnData, TData>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          queryOptions?: QueryOptions<TQueryFnData, TData>
        ]
  ): UseQueryResult<TData, Errors> & {
    invalidate: () => Promise<void>;
    key: QueryKey;
  } {
    return this.useQuery(path, ...(rest as any[]));
  }
}

export type ZodmonMutationAliasHook<Body, Config, MutationOptions, Response> =
  RequiredKeys<Config> extends never
    ? (
        configOptions?: ReadonlyDeep<Config>,
        mutationOptions?: MutationOptions
      ) => UseMutationResult<Response, Errors, UndefinedIfNever<Body>, unknown>
    : (
        configOptions: ReadonlyDeep<Config>,
        mutationOptions?: MutationOptions
      ) => UseMutationResult<Response, Errors, UndefinedIfNever<Body>, unknown>;

export type ZodmonHooksAliases<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = {
  [Alias in Aliases<Api> as `use${Capitalize<Alias>}`]: FindZodmonEndpointDefinitionByAlias<
    Api,
    Alias
  >["method"] extends infer AliasMethod
    ? AliasMethod extends MutationMethod
      ? {
          immutable: FindZodmonEndpointDefinitionByAlias<
            Api,
            Alias
          >["immutable"];
          method: AliasMethod;
        } extends { immutable: true; method: "post" }
        ? // immutable query
          <
            TConfig extends ZodmonRequestOptionsByAlias<
              Api,
              Alias,
              FetcherProvider,
              true,
              TypeProvider
            >,
            TQueryFnData = ZodmonResponseByAlias<
              Api,
              Alias,
              true,
              TypeProvider
            >,
            TData = ZodmonResponseByAlias<Api, Alias, true, TypeProvider>
          >(
            ...[config, queryOptions]: RequiredKeys<TConfig> extends never
              ? [
                  config?: ReadonlyDeep<TConfig>,
                  queryOptions?: ImmutableQueryOptions<TQueryFnData, TData>
                ]
              : [
                  config: ReadonlyDeep<TConfig>,
                  queryOptions?: ImmutableQueryOptions<TQueryFnData, TData>
                ]
          ) => UseQueryResult<TData, Errors> & {
            invalidate: () => Promise<void>;
            key: QueryKey;
          }
        : // useMutation
          ZodmonMutationAliasHook<
            ZodmonBodyByAlias<Api, Alias, true, TypeProvider>,
            Omit<
              ZodmonRequestOptionsByAlias<
                Api,
                Alias,
                FetcherProvider,
                true,
                TypeProvider
              >,
              "body"
            >,
            MutationOptionsByAlias<Api, Alias, TypeProvider>,
            ZodmonResponseByAlias<Api, Alias, true, TypeProvider>
          >
      : // useQuery
        <
          Config extends ZodmonRequestOptionsByAlias<
            Api,
            Alias,
            FetcherProvider,
            true,
            TypeProvider
          >,
          TQueryFnData = ZodmonResponseByAlias<Api, Alias, true, TypeProvider>,
          TData = ZodmonResponseByAlias<Api, Alias, true, TypeProvider>
        >(
          ...rest: RequiredKeys<Config> extends never
            ? [
                configOptions?: ReadonlyDeep<Config>,
                queryOptions?: QueryOptions<TQueryFnData, TData>
              ]
            : [
                configOptions: ReadonlyDeep<Config>,
                queryOptions?: QueryOptions<TQueryFnData, TData>
              ]
        ) => UseQueryResult<TData, Errors> & {
          invalidate: () => Promise<void>;
          key: QueryKey;
        }
    : never;
};

export type ZodmonHooksMutations<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = {
  [M in MutationMethod as `use${Capitalize<M>}`]: <
    Path extends ZodmonPathsByMethod<Api, M>,
    TConfig extends Omit<
      ZodmonRequestOptionsByPath<
        Api,
        M,
        Path,
        FetcherProvider,
        true,
        TypeProvider
      >,
      "body"
    >,
    MutationVariables = UndefinedIfNever<
      ZodmonBodyByPath<Api, M, Path, true, TypeProvider>
    >
  >(
    path: Path,
    ...rest: RequiredKeys<TConfig> extends never
      ? [
          config?: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, M, Path, TypeProvider>
        ]
      : [
          config: ReadonlyDeep<TConfig>,
          mutationOptions?: MutationOptions<Api, M, Path, TypeProvider>
        ]
  ) => UseMutationResult<
    ZodmonResponseByPath<Api, M, Path, true, TypeProvider>,
    Errors,
    MutationVariables
  >;
};

export type ZodmonHooksInstance<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = ZodmonHooksImpl<Api, FetcherProvider, TypeProvider> &
  ZodmonHooksAliases<Api, FetcherProvider, TypeProvider> &
  ZodmonHooksMutations<Api, FetcherProvider, TypeProvider>;

export type ZodmonHooks = {
  new <
    Api extends
      | readonly ZodmonEndpointDefinition[]
      | ZodmonEndpointDefinition[],
    FetcherProvider extends AnyZodmonFetcherProvider,
    TypeProvider extends AnyZodmonTypeProvider
  >(
    name: string,
    zodmon: ZodmonInstance<Api, FetcherProvider, TypeProvider>,
    options?: { shouldAbortOnUnmount?: boolean }
  ): ZodmonHooksInstance<Api, FetcherProvider, TypeProvider>;
};

export const ZodmonHooks = ZodmonHooksImpl as ZodmonHooks;
