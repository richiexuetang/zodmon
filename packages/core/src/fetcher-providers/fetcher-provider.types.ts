import { Merge, ReadonlyDeep } from "../utils.types";
import { AnyZodmonRequestOptions } from "../zodmon.types";

/**
 * A type provider for Fetcher
 * allows to define request, response and error types for a fetcher
 */
export interface AnyZodmonFetcherProvider {
  /**
   * inputs types to call fetcher
   */
  arg1: unknown;
  arg2: unknown;

  /**
   * config types to call fetcher
   */
  options: unknown;
  config: unknown;
  response: any;
  error: any;
}

export type TypeOfFetcherConfig<
  FetcherProvider extends AnyZodmonFetcherProvider
> = FetcherProvider["config"];

export type TypeOfFetcherError<
  FetcherProvider extends AnyZodmonFetcherProvider,
  Response,
  Status
> = (FetcherProvider & {
  arg1: Response;
  arg2: Status;
})["error"];

export type TypeOfFetcherResponse<
  FetcherProvider extends AnyZodmonFetcherProvider
> = FetcherProvider["response"];

export type TypeOfFetcherOptions<
  FetcherProvider extends AnyZodmonFetcherProvider
> = FetcherProvider["options"];

export interface ZodmonFetcher<
  FetcherProvider extends AnyZodmonFetcherProvider
> {
  baseURL?: string;
  fetch(
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>
  ): Promise<TypeOfFetcherResponse<FetcherProvider>>;
}

export type ZodmonFetcherFactoryOptions<
  FetcherProvider extends AnyZodmonFetcherProvider
> = Merge<
  {
    baseURL?: string;
  },
  TypeOfFetcherOptions<FetcherProvider>
>;

export type ZodmonFetcherFactory<
  FetcherProvider extends AnyZodmonFetcherProvider
> = (
  options?: ZodmonFetcherFactoryOptions<FetcherProvider>
) => ZodmonFetcher<FetcherProvider>;
