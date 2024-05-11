import {
  AnyZodmonFetcherProvider,
  ZodmonFetcher,
} from "./fetcher-providers/fetcher-provider.types";

export const hooks: {
  fetcher?: ZodmonFetcher<any>;
} = {};

export function setFetcherHook<Provider extends AnyZodmonFetcherProvider>(
  fetcher: ZodmonFetcher<Provider>
) {
  hooks.fetcher = fetcher;
}

export function clearFetcherHook() {
  hooks.fetcher = undefined;
}
