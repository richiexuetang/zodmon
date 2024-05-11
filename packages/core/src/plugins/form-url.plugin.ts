import { AnyZodmonFetcherProvider } from "../fetcher-providers";
import { ZodmonError } from "../zodmon-error";
import type { ZodmonPlugin } from "../zodmon.types";

/**
 * form-url plugin used internally by Zodmon.
 * @example
 * ```typescript
 *   const apiClient = new Zodmon(
 *     "https://mywebsite.com",
 *     [{
 *       method: "post",
 *       path: "/login",
 *       alias: "login",
 *       description: "Submit a form",
 *       requestFormat: "form-url",
 *       parameters:[
 *         {
 *           name: "body",
 *           type: "Body",
 *           schema: z.object({
 *             userName: z.string(),
 *             password: z.string(),
 *           }),
 *         }
 *       ],
 *       response: z.object({
 *         id: z.number(),
 *       }),
 *     }],
 *   );
 *   const id = await apiClient.login({ userName: "user", password: "password" });
 * ```
 * @returns form-url plugin
 */
export function formURLPlugin<
  FetcherProvider extends AnyZodmonFetcherProvider
>(): ZodmonPlugin<FetcherProvider> {
  return {
    name: "form-url",
    request: async (_, config) => {
      if (
        !config.body ||
        typeof config.body !== "object" ||
        Array.isArray(config.body)
      ) {
        throw new ZodmonError(
          "Zodmon: application/x-www-form-urlencoded body must be an object",
          config
        );
      }

      return {
        ...config,
        body: new URLSearchParams(config.body as any).toString(),
        headers: {
          ...config.headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
    },
  };
}
