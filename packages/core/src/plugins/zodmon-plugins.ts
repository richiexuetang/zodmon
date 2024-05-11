import type {
  AnyZodmonFetcherProvider,
  TypeOfFetcherResponse,
} from "../fetcher-providers";
import type { ReadonlyDeep } from "../utils.types";
import type {
  AnyZodmonRequestOptions,
  ZodmonEndpointDefinition,
  ZodmonPlugin,
} from "../zodmon.types";
import {
  PluginId,
  ZodmonPluginRegistration,
  RequiredZodmonPluginRegistration,
  ZodmonPluginFilters,
  PluginPriority,
  PLUGIN_PRIORITIES_REQUEST,
  PLUGIN_PRIORITIES_RESPONSE,
  PluginPriorities,
} from "./zodmon-plugins.types";

const matchPluginFilter = (
  endpoint: ZodmonEndpointDefinition,
  filters: ZodmonPluginFilters
) => {
  return (Object.keys(filters) as (keyof ZodmonPluginFilters)[]).every(
    (key) => {
      const filter = filters[key];
      const endpointValue = endpoint[key];
      if (typeof filter === "string" && endpointValue) {
        return filter === endpointValue;
      }
      if (filter instanceof RegExp && endpointValue) {
        return filter.test(endpointValue);
      }
      if (typeof filter === "function") {
        return filter(endpointValue ?? "");
      }
      return filter === undefined;
    }
  );
};

const isPluginFor =
  <FetcherProvider extends AnyZodmonFetcherProvider>(
    endpoint: ZodmonEndpointDefinition,
    priority: PluginPriority,
    type: "request" | "response"
  ) =>
  (
    plugin: ZodmonPluginRegistration<FetcherProvider>
  ): plugin is RequiredZodmonPluginRegistration<FetcherProvider> => {
    return (
      plugin.priority === priority &&
      Boolean(plugin.plugin) &&
      Boolean(
        type === "request"
          ? plugin.plugin!.request
          : plugin.plugin!.response || plugin.plugin!.error
      ) &&
      matchPluginFilter(endpoint, plugin.filter)
    );
  };
export class ZodmonPlugins<FetcherProvider extends AnyZodmonFetcherProvider> {
  private plugins: Array<ZodmonPluginRegistration<FetcherProvider>> = [];

  constructor() {}

  /**
   * register a plugin
   * @param filter - how to match the plugin
   * @param plugin - plugin to be registered
   * @param priority - low, normal, high, default: normal
   * @returns - plugin id to be used for ejecting
   */
  use(
    filter: ZodmonPluginFilters,
    plugin: ZodmonPlugin<FetcherProvider>,
    priority: PluginPriority = PluginPriorities.normal
  ): PluginId {
    this.plugins.push({
      filter,
      plugin,
      priority,
    });
    return this.plugins.length - 1;
  }
  eject(id: PluginId) {
    this.plugins[id].plugin = undefined;
  }

  /**
   * intercept the request before it is sent to the server
   * apply plugins in order of registration (internal plugins first)
   * @param endpoint - endpoint definition
   * @param config - request config
   * @returns - modified request config
   */
  async interceptRequest(
    endpoint: ZodmonEndpointDefinition,
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>
  ) {
    let pluginConfig = config;
    for (const priority of PLUGIN_PRIORITIES_REQUEST) {
      for (const plugin of this.plugins.filter(
        isPluginFor(endpoint, priority, "request")
      )) {
        pluginConfig = await plugin.plugin.request(endpoint, pluginConfig);
      }
    }
    return pluginConfig;
  }

  /**
   * intercept the response before it is returned to the user
   * apply plugins in reverse order of registration (user plugins first)
   * @param endpoint - endpoint definition
   * @param config - request config
   * @param response - response promise from the server
   * @returns - modified response promise
   */
  async interceptResponse(
    endpoint: ZodmonEndpointDefinition,
    config: ReadonlyDeep<AnyZodmonRequestOptions<FetcherProvider>>,
    response: Promise<TypeOfFetcherResponse<FetcherProvider>>
  ) {
    let pluginResponse = response;
    const plugins = [...this.plugins].reverse();

    for (const priority of PLUGIN_PRIORITIES_RESPONSE) {
      for (const plugin of plugins.filter(
        isPluginFor(endpoint, priority, "response")
      )) {
        pluginResponse = pluginResponse.then(
          Boolean(plugin.plugin.response)
            ? (res) => plugin.plugin.response(endpoint, config, res)
            : undefined,
          Boolean(plugin.plugin.error)
            ? (err) => {
                console.log("plugin error", err);
                return plugin.plugin.error(endpoint, config, err);
              }
            : undefined
        );
      }
    }
    return pluginResponse;
  }
}
