import { AnyZodmonFetcherProvider } from "../fetcher-providers";
import { ZodmonPlugin } from "../zodmon.types";

export type PluginId = number;

export const PluginPriorities = {
  low: "low",
  normal: "normal",
  high: "high",
} as const;

export const PLUGIN_PRIORITIES_REQUEST = [
  PluginPriorities.high,
  PluginPriorities.normal,
  PluginPriorities.low,
] as const;

export const PLUGIN_PRIORITIES_RESPONSE = [
  PluginPriorities.low,
  PluginPriorities.normal,
  PluginPriorities.high,
] as const;

export type PluginPriority = keyof typeof PluginPriorities;

export type ZodmonPluginFilters = {
  method?: string | RegExp | ((method: string) => boolean);
  path?: string | RegExp | ((path: string) => boolean);
  alias?: string | RegExp | ((alias: string) => boolean);
};

export type ZodmonPluginRegistration<
  FetcherProvider extends AnyZodmonFetcherProvider
> = {
  priority: PluginPriority;
  filter: ZodmonPluginFilters;
  plugin?: ZodmonPlugin<FetcherProvider>;
};

export type RequiredZodmonPluginRegistration<
  FetcherProvider extends AnyZodmonFetcherProvider
> = {
  priority: PluginPriority;
  filter: ZodmonPluginFilters;
  plugin: Required<ZodmonPlugin<FetcherProvider>>;
};
