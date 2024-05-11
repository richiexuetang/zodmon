import { AnyZodmonFetcherProvider } from "../fetcher-providers";
import type { ZodmonPlugin } from "../zodmon.types";

export function headerPlugin<
  FetcherProvider extends AnyZodmonFetcherProvider = AnyZodmonFetcherProvider
>(key: string, value: string): ZodmonPlugin<FetcherProvider> {
  return {
    request: async (_, config) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          [key]: value,
        },
      };
    },
  };
}
