import type {
  ZodmonEndpointDefinition,
  ZodmonOptions,
  AnyZodmonTypeProvider,
  TypeOfFetcherOptions,
  ZodmonInstance,
  ZodTypeProvider,
} from "@zodmon/core";
import { ZodmonCore } from "@zodmon/core";
import { axiosFactory, AxiosProvider } from "./axios-provider";

function isZodmonOptions(
  lastArg: unknown
): lastArg is ZodmonOptions<AxiosProvider> {
  return !Array.isArray(lastArg) && typeof lastArg === "object";
}

const ZodmonAxios = new Proxy(ZodmonCore, {
  construct(target, args) {
    if (args.length !== 0) {
      let lastArg = args[args.length - 1];
      if (isZodmonOptions(lastArg)) {
        lastArg.fetcherFactory = axiosFactory;
      } else {
        args.push({ fetcherFactory: axiosFactory });
      }
    }
    // @ts-ignore
    return new target(...args);
  },
});

export interface Zodmon {
  new <
    const Api extends
      | readonly ZodmonEndpointDefinition[]
      | ZodmonEndpointDefinition[],
    TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
  >(
    api: Api,
    options?: Omit<
      ZodmonOptions<AxiosProvider, TypeProvider>,
      "fetcherFactory"
    > &
      TypeOfFetcherOptions<AxiosProvider>
  ): ZodmonInstance<Api, AxiosProvider, TypeProvider>;
  new <
    const Api extends
      | readonly ZodmonEndpointDefinition[]
      | ZodmonEndpointDefinition[],
    TypeProvider extends AnyZodmonTypeProvider = ZodTypeProvider
  >(
    baseUrl: string,
    api: Api,
    options?: Omit<
      ZodmonOptions<AxiosProvider, TypeProvider>,
      "fetcherFactory"
    > &
      TypeOfFetcherOptions<AxiosProvider>
  ): ZodmonInstance<Api, AxiosProvider, TypeProvider>;
}

const Zodmon = ZodmonAxios as Zodmon;

export { Zodmon };
