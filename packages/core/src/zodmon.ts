import type {
  AnyZodmonRequestOptions,
  ZodmonRequestOptions,
  Method,
  ZodmonPathsByMethod,
  ZodmonResponseByPath,
  ZodmonOptions,
  ZodmonEndpointDefinition,
  ZodmonAliases,
  ZodmonPlugin,
  Aliases,
  ZodmonEndpointError,
  ZodmonMatchingErrorsByPath,
  ZodmonMatchingErrorsByAlias,
  ZodmonVerbs,
} from "./zodmon.types";
import { HTTP_METHODS } from "./zodmon.types";
import {
  ZodmonPlugins,
  schemaValidationPlugin,
  formDataPlugin,
  formURLPlugin,
  headerPlugin,
} from "./plugins";
import type { PickRequired, ReadonlyDeep } from "./utils.types";
import { checkApi } from "./api";
import type { AnyZodmonTypeProvider, ZodTypeProvider } from "./type-providers";
import { zodTypeProvider } from "./type-providers";
import {
  AnyZodmonFetcherProvider,
  TypeOfFetcherOptions,
  ZodmonFetcher,
} from "./fetcher-providers";
import {
  findEndpoint,
  findEndpointErrorsByAlias,
  findEndpointErrorsByPath,
} from "./utils";
import { hooks } from "./hooks";
import {
  PluginPriority,
  ZodmonPluginFilters,
  PluginId,
  PluginPriorities,
} from "./plugins/zodmon-plugins.types";

export interface ZodmonBase<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> {
  readonly api: Api;
  readonly _typeProvider: TypeProvider;
  readonly _fetcherProvider: FetcherProvider;
}

/**
 * zodmon api client
 */
export class ZodmonCoreImpl<
  const Api extends
    | readonly ZodmonEndpointDefinition[]
    | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
> implements ZodmonBase<Api, FetcherProvider, TypeProvider>
{
  public readonly options: PickRequired<
    ZodmonOptions<FetcherProvider, TypeProvider>,
    "validate" | "transform" | "sendDefaults" | "typeProvider"
  >;
  public readonly api: Api;
  public readonly fetcher: ZodmonFetcher<FetcherProvider> | undefined;
  public readonly _typeProvider: TypeProvider;
  public readonly _fetcherProvider: FetcherProvider;
  private plugins = new ZodmonPlugins<FetcherProvider>();

  /**
   * constructor
   * @param baseURL - the base url to use - if omited will use the browser domain
   * @param api - the description of all the api endpoints
   * @param options - the options to setup the client API
   * @example
   *   const apiClient = new Zodmon("https://jsonplaceholder.typicode.com", [
   *     {
   *       method: "get",
   *       path: "/users",
   *       description: "Get all users",
   *       parameters: [
   *         {
   *           name: "q",
   *           type: "Query",
   *           schema: z.string(),
   *         },
   *         {
   *           name: "page",
   *           type: "Query",
   *           schema: z.string().optional(),
   *         },
   *       ],
   *       response: z.array(z.object({ id: z.number(), name: z.string() })),
   *     }
   *   ]);
   */
  constructor(
    api: Api,
    options?: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  );
  constructor(
    baseUrl: string,
    api: Api,
    options?: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  );
  constructor(
    arg1?: Api | string,
    arg2?:
      | Api
      | (ZodmonOptions<FetcherProvider, TypeProvider> &
          TypeOfFetcherOptions<FetcherProvider>),
    arg3?: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ) {
    let options: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>;
    if (!arg1) {
      if (Array.isArray(arg2)) {
        throw new Error("Zodmon: missing base url");
      }
      throw new Error("Zodmon: missing api description");
    }
    let baseURL: string | undefined;
    if (typeof arg1 === "string" && Array.isArray(arg2)) {
      baseURL = arg1;
      this.api = arg2 as any;
      options = arg3 || {};
    } else if (Array.isArray(arg1) && !Array.isArray(arg2)) {
      this.api = arg1 as any;
      options = arg2 || {};
    } else {
      throw new Error("Zodmon: api must be an array");
    }

    checkApi(this.api);

    this.options = {
      validate: true,
      transform: true,
      sendDefaults: false,
      typeProvider: zodTypeProvider as any,
      ...options,
    };
    this._typeProvider = undefined as any;
    this._fetcherProvider = undefined as any;

    this.fetcher = this.options.fetcherFactory?.({
      baseURL,
      ...this.options,
    } as any);

    this.injectAliasEndpoints();
    this.injectHttpVerbEndpoints();
    this.initPlugins();
    if ([true, "all", "request", "response"].includes(this.options.validate)) {
      this.use(schemaValidationPlugin(this.options), PluginPriorities.high);
    }
  }

  public get typeProvider() {
    return this.options.typeProvider;
  }

  private initPlugins() {
    this.api.forEach((endpoint) => {
      switch (endpoint.requestFormat) {
        case "binary":
          this.plugins.use(
            {
              method: endpoint.method,
              path: endpoint.path,
              alias: endpoint.alias,
            },
            headerPlugin<FetcherProvider>(
              "Content-Type",
              "application/octet-stream"
            )
          );
          break;
        case "form-data":
          this.plugins.use(
            {
              method: endpoint.method,
              path: endpoint.path,
              alias: endpoint.alias,
            },
            formDataPlugin<FetcherProvider>()
          );
          break;
        case "form-url":
          this.plugins.use(
            {
              method: endpoint.method,
              path: endpoint.path,
              alias: endpoint.alias,
            },
            formURLPlugin<FetcherProvider>()
          );
          break;
        case "text":
          this.plugins.use(
            {
              method: endpoint.method,
              path: endpoint.path,
              alias: endpoint.alias,
            },
            headerPlugin<FetcherProvider>("Content-Type", "text/plain")
          );
          break;
      }
    });
  }

  /**
   * register a plugin to intercept the requests or responses
   * @param plugin - the plugin to use
   * @returns an id to allow you to unregister the plugin
   */
  use(
    plugin: ZodmonPlugin<FetcherProvider>,
    priority?: PluginPriority
  ): PluginId;
  use<Alias extends Aliases<Api>>(
    alias: Alias,
    plugin: ZodmonPlugin<FetcherProvider>,
    priority?: PluginPriority
  ): PluginId;
  use<M extends Method, Path extends ZodmonPathsByMethod<Api, M>>(
    method: M,
    path: Path,
    plugin: ZodmonPlugin<FetcherProvider>,
    priority?: PluginPriority
  ): PluginId;
  use(
    filter: ZodmonPluginFilters,
    plugin: ZodmonPlugin<FetcherProvider>,
    priority?: PluginPriority
  ): PluginId;
  use(
    arg0: ZodmonPlugin<FetcherProvider> | ZodmonPluginFilters | string,
    arg1?: ZodmonPlugin<FetcherProvider> | string,
    arg2?: ZodmonPlugin<FetcherProvider> | PluginPriority,
    arg3?: PluginPriority
  ) {
    if (typeof arg0 === "object") {
      if ("method" in arg0 || "path" in arg0 || "alias" in arg0) {
        return this.plugins.use(
          arg0,
          arg1 as ZodmonPlugin<FetcherProvider>,
          arg2 as PluginPriority
        );
      }
      return this.plugins.use(
        {},
        arg0 as ZodmonPlugin<FetcherProvider>,
        arg1 as PluginPriority
      );
    }
    if (typeof arg0 === "string" && typeof arg1 === "object") {
      return this.plugins.use(
        { alias: arg0 },
        arg1 as ZodmonPlugin<FetcherProvider>,
        arg2 as PluginPriority
      );
    }
    if (
      typeof arg0 === "string" &&
      typeof arg1 === "string" &&
      typeof arg2 === "object"
    ) {
      return this.plugins.use(
        { method: arg0, path: arg1 },
        arg2 as ZodmonPlugin<FetcherProvider>,
        arg3 as PluginPriority
      );
    }

    throw new Error("Zodmon: invalid plugin registration");
  }

  /**
   * unregister a plugin
   * if the plugin name is provided instead of the registration plugin id,
   * it will unregister the plugin with that name only for non endpoint plugins
   * @param plugin - id of the plugin to remove
   */
  eject(plugin: PluginId): void {
    this.plugins.eject(plugin);
  }

  private injectAliasEndpoints() {
    this.api.forEach((endpoint) => {
      if (endpoint.alias) {
        (this as any)[endpoint.alias] = (config: any) =>
          this.request({
            ...config,
            method: endpoint.method,
            url: endpoint.path,
          });
      }
    });
  }

  private injectHttpVerbEndpoints() {
    HTTP_METHODS.forEach((method) => {
      (this as any)[method] = (path: string, config: any) =>
        this.request({
          ...config,
          method,
          url: path,
        });
    });
  }

  /**
   * make a request to the api
   * @param config - the config to setup zodmon options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async request<M extends Method, Path extends string>(
    config: Path extends ZodmonPathsByMethod<Api, M>
      ? ReadonlyDeep<
          ZodmonRequestOptions<
            Api,
            M,
            Path,
            FetcherProvider,
            true,
            TypeProvider
          >
        >
      : ReadonlyDeep<
          ZodmonRequestOptions<
            Api,
            M,
            ZodmonPathsByMethod<Api, M>,
            FetcherProvider,
            true,
            TypeProvider
          >
        >
  ): Promise<
    ZodmonResponseByPath<
      Api,
      M,
      Path extends ZodmonPathsByMethod<Api, M> ? Path : never,
      true,
      TypeProvider
    >
  > {
    let conf = config as unknown as ReadonlyDeep<
      AnyZodmonRequestOptions<FetcherProvider>
    >;
    const endpoint = findEndpoint(this.api, conf.method, conf.url);
    if (!endpoint) {
      throw new Error(
        `Zodmon: no endpoint found for ${conf.method} ${conf.url}`
      );
    }
    conf = await this.plugins.interceptRequest(endpoint, conf);
    let response: Promise<any>;
    if (hooks.fetcher) {
      response = hooks.fetcher.fetch(conf);
    } else if (this.fetcher) {
      response = this.fetcher.fetch(conf);
    } else {
      throw new Error("Zodmon: no fetcher provider found");
    }
    response = this.plugins.interceptResponse(endpoint, conf, response);
    return (await response).data;
  }

  private isDefinedError(
    error: unknown,
    findEndpointErrors: (error: unknown) => ZodmonEndpointError[] | undefined
  ): boolean {
    if (error && typeof error === "object" && "response" in error) {
      const response = error.response;
      if (response && typeof response === "object" && "data" in response) {
        const endpointErrors = findEndpointErrors(error);
        if (endpointErrors) {
          return endpointErrors.some(
            (desc) =>
              this.options.typeProvider.validate(desc.schema, response.data)
                .success
          );
        }
      }
    }
    return false;
  }

  /**
   * check if the error is matching the endpoint errors definitions
   * @param api - the api definition
   * @param method - http method of the endpoint
   * @param path - path of the endpoint
   * @param error - the error to check
   * @returns - if true, the error type is narrowed to the matching endpoint errors
   */
  isErrorFromPath<M extends Method, Path extends ZodmonPathsByMethod<Api, M>>(
    method: M,
    path: Path,
    error: unknown
  ): error is ZodmonMatchingErrorsByPath<
    Api,
    M,
    Path,
    FetcherProvider,
    TypeProvider
  > {
    return this.isDefinedError(error, (err) =>
      findEndpointErrorsByPath(this.api, method, path, err)
    );
  }

  /**
   * check if the error is matching the endpoint errors definitions
   * @param api - the api definition
   * @param alias - alias of the endpoint
   * @param error - the error to check
   * @returns - if true, the error type is narrowed to the matching endpoint errors
   */
  isErrorFromAlias<Alias extends Aliases<Api>>(
    alias: Alias,
    error: unknown
  ): error is ZodmonMatchingErrorsByAlias<
    Api,
    Alias,
    FetcherProvider,
    TypeProvider
  > {
    return this.isDefinedError(error, (err) =>
      findEndpointErrorsByAlias(this.api, alias, err)
    );
  }
}

export type ZodmonInstance<
  Api extends readonly ZodmonEndpointDefinition[] | ZodmonEndpointDefinition[],
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = ZodmonCoreImpl<Api, FetcherProvider, TypeProvider> &
  ZodmonAliases<Api, FetcherProvider, TypeProvider> &
  ZodmonVerbs<Api, FetcherProvider, TypeProvider>;

export interface ZodmonCore {
  new <
    const Api extends
      | readonly ZodmonEndpointDefinition[]
      | ZodmonEndpointDefinition[],
    FetcherProvider extends AnyZodmonFetcherProvider,
    TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
  >(
    api: Api,
    options?: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ): ZodmonInstance<Api, FetcherProvider, TypeProvider>;
  new <
    const Api extends
      | readonly ZodmonEndpointDefinition[]
      | ZodmonEndpointDefinition[],
    FetcherProvider extends AnyZodmonFetcherProvider,
    TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
  >(
    baseUrl: string,
    api: Api,
    options?: ZodmonOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ): ZodmonInstance<Api, FetcherProvider, TypeProvider>;
}

export const ZodmonCore = ZodmonCoreImpl as ZodmonCore;

/**
 * Get the Api description type from zodmon
 * @param Z - zodmon type
 */
export type ApiOf<Z extends ZodmonBase<any, any, any>> = Z["api"];
/**
 * Get the type provider type from zodmon
 * @param Z - zodmon type
 */
export type TypeProviderOf<Z extends ZodmonBase<any, any, any>> =
  Z["_typeProvider"];

export type FetcherProviderOf<Z extends ZodmonBase<any, any, any>> =
  Z["_fetcherProvider"];
