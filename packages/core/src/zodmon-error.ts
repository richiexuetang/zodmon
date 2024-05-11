import { AnyZodmonFetcherProvider } from "./fetcher-providers";
import type { ReadonlyDeep, DeepReadonlyObject } from "./utils.types";
import type { AnyZodmonRequestOptions } from "./zodmon.types";

/**
 * Custom Zodmon Error with additional information
 * @param message - the error message
 * @param data - the parameter or response object that caused the error
 * @param config - the config object from zodmon
 * @param cause - the error cause
 */
export class ZodmonError extends Error {
  constructor(
    message: string,
    public readonly config?: ReadonlyDeep<
      AnyZodmonRequestOptions<AnyZodmonFetcherProvider>
    >,
    public readonly data?: unknown,
    public readonly cause?: Error
  ) {
    super(message);
  }
}
