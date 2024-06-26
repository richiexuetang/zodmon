import { ZodmonError } from "../zodmon-error";
import type { AnyZodmonTypeProvider } from "../type-providers";
import type { ZodmonOptions, ZodmonPlugin } from "../zodmon.types";
import { AnyZodmonFetcherProvider } from "../fetcher-providers";

type Options<
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
> = Required<
  Pick<
    ZodmonOptions<FetcherProvider, TypeProvider>,
    "validate" | "transform" | "sendDefaults" | "typeProvider"
  >
>;

function shouldResponse(option: string | boolean) {
  return [true, "response", "all"].includes(option);
}

function shouldRequest(option: string | boolean) {
  return [true, "request", "all"].includes(option);
}

/**
 * alidation plugin used internally by Zodmon.
 * By default zodmon always validates the response.
 * @returns schema-validation plugin
 */
export function schemaValidationPlugin<
  FetcherProvider extends AnyZodmonFetcherProvider,
  TypeProvider extends AnyZodmonTypeProvider
>({
  validate,
  transform,
  sendDefaults,
  typeProvider,
}: Options<FetcherProvider, TypeProvider>): ZodmonPlugin<FetcherProvider> {
  return {
    name: "schema-validation",
    request: shouldRequest(validate)
      ? async (endpoint, config) => {
          const { parameters } = endpoint;
          if (!parameters) {
            return config;
          }
          const conf = {
            ...config,
            queries: {
              ...config.queries,
            },
            headers: {
              ...config.headers,
            },
            params: {
              ...config.params,
            },
            body: config.body,
          };
          const paramsOf = {
            Query: (name: string) => conf.queries?.[name],
            Body: (_: string) => conf.body,
            Header: (name: string) => conf.headers?.[name],
            Path: (name: string) => conf.params?.[name],
          };
          const setParamsOf = {
            Query: (name: string, value: any) => (conf.queries![name] = value),
            Body: (_: string, value: any) => (conf.body = value),
            Header: (name: string, value: any) => (conf.headers![name] = value),
            Path: (name: string, value: any) => (conf.params![name] = value),
          };
          const transformRequest = shouldRequest(transform);
          for (const parameter of parameters) {
            const { name, schema, type } = parameter;
            const value = paramsOf[type](name);
            if (sendDefaults || value !== undefined) {
              const parsed = await typeProvider.validateAsync(schema, value);
              if (!parsed.success) {
                throw new ZodmonError(
                  `Zodmon: Invalid ${type} parameter '${name}'`,
                  config,
                  value,
                  parsed.error
                );
              }
              if (transformRequest) {
                setParamsOf[type](name, parsed.data);
              }
            }
          }
          return conf;
        }
      : undefined,
    response: shouldResponse(validate)
      ? async (endpoint, config, response) => {
          if (
            typeof response.headers?.get === "function"
              ? (response.headers.get("content-type") as string)?.includes?.(
                  "application/json"
                )
              : response.headers?.["content-type"]?.includes?.(
                  "application/json"
                )
          ) {
            const parsed = await typeProvider.validateAsync(
              endpoint.response,
              response.data
            );
            if (!parsed.success) {
              throw new ZodmonError(
                `Zodmon: Invalid response from endpoint '${endpoint.method} ${
                  endpoint.path
                }'\nstatus: ${response.status} ${
                  response.statusText
                }\ncause:\n${
                  parsed.error.message ?? JSON.stringify(parsed.error)
                }\nreceived:\n${JSON.stringify(response.data, null, 2)}`,
                config,
                response.data,
                parsed.error
              );
            }
            if (shouldResponse(transform)) {
              response.data = parsed.data;
            }
          }
          return response;
        }
      : undefined,
  };
}
