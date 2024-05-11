import { z, ZodError } from "zod";

//Mock form data
globalThis.FormData = class FormData {
  data = new Map<string, string | File>();
  append(name: string, value: string | Blob, fileName?: string): void {
    this.data.set(name, `${value}`);
  }
  delete(name: string): void {
    this.data.delete(name);
  }
  get(name: string): string | File | null {
    return this.data.get(name) || null;
  }
  getAll(name: string): (string | File)[] {
    return this.data.has(name) ? [this.data.get(name)!] : [];
  }
  has(name: string): boolean {
    return this.data.has(name);
  }
  set(name: string, value: string | Blob, fileName?: string): void {
    if (typeof value === "string") {
      this.data.set(name, value);
    }
  }
  forEach(
    callbackfn: (value: string | File, key: string, parent: FormData) => void,
    thisArg?: any
  ): void {
    this.data.forEach((value, key) => callbackfn(value, key, this));
  }
};

import {
  ZodmonCore,
  ZodmonError,
  apiBuilder,
  makeApi,
  makeParameters,
  ApiOf,
  ZodTypeProvider,
} from "./index";

import type { Assert } from "./utils.types";
import {
  FindZodmonEndpointDefinitionByPath,
  ZodmonMatchingErrorsByPath,
} from "./zodmon.types";
import {
  zodmonMocks,
  MockProvider,
  mockFetchFactory,
} from "./fetcher-providers/mock-provider";

describe("Zodmon", () => {
  beforeAll(async () => {
    zodmonMocks.install();
    zodmonMocks.mockRequest("get", "/token", async (conf) => ({
      data: {
        token: conf.headers!.authorization,
      },
    }));
    zodmonMocks.mockRequest("post", "/token", async (conf) => ({
      data: {
        token: conf.headers!.authorization,
      },
    }));
    zodmonMocks.mockRequest("get", "/error401", async (conf) => ({
      status: 401,
      statusText: "Unauthorized",
      data: {},
    }));
    zodmonMocks.mockRequest("get", "/error/:id/error401", async (conf) => ({
      status: 401,
      statusText: "Unauthorized",
      data: {},
    }));
    zodmonMocks.mockRequest(
      "get",
      "/error/:id/error401/:message",
      async (conf) => ({
        status: 401,
        statusText: "Unauthorized",
        data: {},
      })
    );
    zodmonMocks.mockRequest("get", "/error502", async (conf) => ({
      status: 502,
      statusText: "Bad Gateway",
      data: {
        error: {
          message: "bad gateway",
        },
      },
    }));
    zodmonMocks.mockRequest("get", "/queries", async (conf) => ({
      data: {
        queries: conf.queries!.id,
      },
    }));
    zodmonMocks.mockRequest("get", "/:id", async (conf) => ({
      data: {
        id: conf.params!.id,
        name: "test",
      },
      headers: {
        "content-type": "application/json",
      },
    }));
    zodmonMocks.mockRequest("get", "/path/:uuid", async (config) => ({
      data: {
        uuid: config.params!.uuid,
      },
    }));
    zodmonMocks.mockRequest("get", "/:id/address/:address", async (config) => ({
      data: {
        id: config.params!.id,
        address: config.params!.address,
      },
    }));
    zodmonMocks.mockRequest("post", "/", async (config) => ({
      data: {
        id: 3,
        // @ts-ignore
        name: config.body.name, // @ts-ignore
      },
    }));
    zodmonMocks.mockRequest("put", "/", async (config) => ({
      data: {
        // @ts-ignore
        id: config.body.id,
        // @ts-ignore
        name: config.body.name,
      },
    }));
    zodmonMocks.mockRequest("patch", "/", async (config) => ({
      data: {
        // @ts-ignore
        id: config.body.id,
        // @ts-ignore
        name: config.body.name,
      },
    }));
    zodmonMocks.mockRequest("delete", "/:id", async (config) => ({
      data: {
        id: config.params!.id,
      },
    }));
    zodmonMocks.mockRequest("post", "/form-data", async (config) => {
      const data = {};
      (config.body as FormData).forEach((value, key) => {
        // @ts-ignore
        data[key] = value;
      });
      return {
        data,
      };
    });
    zodmonMocks.mockRequest("post", "/form-url", async (config) => {
      const data = {};
      const url = new URLSearchParams(config.body as string);
      for (const [key, value] of url) {
        // @ts-ignore
        data[key] = value;
      }
      return {
        data,
      };
    });
    zodmonMocks.mockRequest("post", "/text", async (config) => ({
      headers: {
        "content-type": "text/plain",
      },
      data: config.body,
    }));
  });

  afterAll(() => {
    zodmonMocks.uninstall();
  });

  it("should be defined", () => {
    expect(ZodmonCore).toBeDefined();
  });

  it("should throw if baseUrl is not provided", () => {
    // @ts-ignore
    expect(() => new ZodmonCore(undefined, [])).toThrowError(
      "Zodmon: missing base url"
    );
  });

  it("should throw if api is not provided", () => {
    // @ts-ignore
    expect(() => new ZodmonCore()).toThrowError(
      "Zodmon: missing api description"
    );
  });

  it("should throw if api is not an array", () => {
    // @ts-ignore
    expect(() => new ZodmonCore({})).toThrowError(
      "Zodmon: api must be an array"
    );
  });

  it("should create a new instance of Zodmon", () => {
    const zodmon = new ZodmonCore(`http://localhost`, []);
    expect(zodmon).toBeDefined();
  });
  it("should create a new instance when providing an api", () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    expect(zodmon).toBeDefined();
  });

  it("should should throw with duplicate api endpoints", () => {
    expect(
      () =>
        new ZodmonCore(`http://localhost`, [
          {
            method: "get",
            path: "/:id",
            response: z.object({
              id: z.number(),
              name: z.string(),
            }),
          },
          {
            method: "get",
            path: "/:id",
            response: z.object({
              id: z.number(),
              name: z.string(),
            }),
          },
        ])
    ).toThrowError("Zodmon: Duplicate path 'get /:id'");
  });

  it("should create a new instance whithout base URL", () => {
    const zodmon = new ZodmonCore([
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    expect(zodmon).toBeDefined();
  });

  it("should register have validation plugin automatically installed", () => {
    const zodmon = new ZodmonCore(`http://localhost`, []);
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(1);
  });

  it("should register a plugin", () => {
    const zodmon = new ZodmonCore(`http://localhost`, []);
    zodmon.use({
      request: async (_, config) => config,
    });
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(2);
  });

  it("should unregister a plugin", () => {
    const zodmon = new ZodmonCore(`http://localhost`, []);
    const id = zodmon.use({
      request: async (_, config) => config,
    });
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(2);
    zodmon.eject(id);
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(1);
  });

  it("should throw if invalide parameters when registering a plugin", () => {
    const zodmon = new ZodmonCore(`http://localhost`, []);
    // @ts-expect-error
    expect(() => zodmon.use(0)).toThrowError("Zodmon: invalid plugin");
  });

  it("should register a plugin by endpoint", () => {
    const api = makeApi([
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);

    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    zodmon.use("get", "/:id", {
      request: async (_, config) => config,
    });
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(2);
  });

  it("should register a plugin by alias", () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        path: "/:id",
        alias: "test",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    zodmon.use("test", {
      request: async (_, config) => config,
    });
    expect(
      // @ts-expect-error
      zodmon.plugins.plugins.filter((plugin) => plugin.plugin).length
    ).toBe(2);
  });

  it("should make an http request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
        {
          method: "get",
          path: "/users",
          response: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            })
          ),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.request({
      //      ^?
      method: "get",
      url: "/:id",
      params: { id: 7 },
    });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make an http get with standard query arrays", async () => {
    const api = makeApi([
      {
        method: "get",
        path: "/queries",
        parameters: makeParameters([
          {
            name: "id",
            type: "Query",
            schema: z.array(z.number()),
          },
        ]),
        response: z.object({
          queries: z.array(z.string()),
        }),
      },
      {
        method: "get",
        path: "/users",
        response: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
          })
        ),
      },
    ]);
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/queries",
          parameters: [
            {
              name: "id",
              type: "Query",
              schema: z.array(z.number()),
            },
          ],
          response: z.object({
            queries: z.array(z.string()),
          }),
        },
        {
          method: "get",
          path: "/users",
          response: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            })
          ),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.get("/queries", { queries: { id: [1, 2] } });
    expect(response).toEqual({ queries: [1, 2] });
  });

  it("should make an http get with one path params", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.get("/:id", { params: { id: 7 } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;

    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make an http alias request with one path params", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          alias: "getById",
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.getById({ params: { id: 7 } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;

    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should work with api builder", async () => {
    const api = apiBuilder({
      method: "get",
      path: "/:id",
      alias: "getById",
      response: z.object({
        id: z.number(),
        name: z.string(),
      }),
    }).build();
    const zodmon = new ZodmonCore(`http://localhost`, api, {
      fetcherFactory: mockFetchFactory,
    });
    const response = await zodmon.getById({ params: { id: 7 } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;

    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make a get request with bad params and get back a zod error", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          parameters: [
            {
              name: "id",
              type: "Path",
              schema: z.number(),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    try {
      await zodmon.get("/:id", { params: { id: "7" as unknown as number } });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodmonError);
    }
  });

  it("should make an http get with multiples path params", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id/address/:address",
          response: z.object({
            id: z.number(),
            address: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.get("/:id/address/:address", {
      params: { id: 7, address: "address" },
    });
    const testResonseType: Assert<
      typeof response,
      { id: number; address: string }
    > = true;

    expect(response).toEqual({ id: 7, address: "address" });
  });

  it("should make an http post with body param", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/",
          parameters: [
            {
              name: "name",
              type: "Body",
              schema: z.object({
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.post("/", { body: { name: "post" } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 3, name: "post" });
  });

  it("should make an http post with transformed body param", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/",
          parameters: [
            {
              name: "name",
              type: "Body",
              schema: z
                .object({
                  firstname: z.string(),
                  lastname: z.string(),
                })
                .transform((data) => ({
                  name: `${data.firstname} ${data.lastname}`,
                })),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const config = {
      body: { firstname: "post", lastname: "test" },
    } as const;
    const response = await zodmon.post("/", config);
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;

    expect(config).toEqual({
      body: { firstname: "post", lastname: "test" },
    });
    expect(response).toEqual({ id: 3, name: "post test" });
  });

  it("should throw a zodmon error if params are not correct", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/",
          parameters: [
            {
              name: "name",
              type: "Body",
              schema: z
                .object({
                  email: z.string().email(),
                })
                .transform((data) => ({
                  name: `${data.email.split("@")[0]}`,
                })),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let response;
    let error: ZodmonError | undefined;
    try {
      response = await zodmon.post("/", {
        body: {
          email: "post",
        },
      });
    } catch (err) {
      error = err as ZodmonError;
    }
    expect(response).toBeUndefined();
    expect(error).toBeInstanceOf(ZodmonError);
    expect(error!.cause).toBeInstanceOf(ZodError);
    expect(error!.message).toBe("Zodmon: Invalid Body parameter 'name'");
  });

  it("should make an http mutation alias request with body param", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/",
          alias: "create",
          parameters: [
            {
              name: "name",
              type: "Body",
              schema: z.object({
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.create({ body: { name: "post" } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 3, name: "post" });
  });

  it("should make an http put", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "put",
          path: "/",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.put("/", { body: { id: 5, name: "put" } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 5, name: "put" });
  });

  it("should make an http put alias", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "put",
          path: "/",
          alias: "update",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.update({ body: { id: 5, name: "put" } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 5, name: "put" });
  });

  it("should make an http patch", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "patch",
          path: "/",
          parameters: [
            {
              name: "id",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.patch("/", {
      body: { id: 4, name: "patch" },
    });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 4, name: "patch" });
  });

  it("should make an http patch alias", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "patch",
          path: "/",
          alias: "update",
          parameters: [
            {
              name: "id",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.update({ body: { id: 4, name: "patch" } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string }
    > = true;
    expect(response).toEqual({ id: 4, name: "patch" });
  });

  it("should make an http delete", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "delete",
          path: "/:id",
          response: z.object({
            id: z.number(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.delete("/:id", {
      params: { id: 6 },
    });
    const testResonseType: Assert<typeof response, { id: number }> = true;
    expect(response).toEqual({ id: 6 });
  });

  it("should make an http delete alias", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "delete",
          path: "/:id",
          alias: "remove",
          response: z.object({
            id: z.number(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.remove({
      params: { id: 6 },
    });
    const testResonseType: Assert<typeof response, { id: number }> = true;
    expect(response).toEqual({ id: 6 });
  });

  it("should validate uuid in path params", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/path/:uuid",
          parameters: [
            {
              name: "uuid",
              type: "Path",
              schema: z.string().uuid(),
            },
          ],
          response: z.object({
            uuid: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.get("/path/:uuid", {
      params: { uuid: "e9e09a1d-3967-4518-bc89-75a901aee128" },
    });
    const testResonseType: Assert<typeof response, { uuid: string }> = true;
    expect(response).toEqual({
      uuid: "e9e09a1d-3967-4518-bc89-75a901aee128",
    });
  });

  it("should not validate bad path params", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/path/:uuid",
          parameters: [
            {
              name: "uuid",
              type: "Path",
              schema: z.string().uuid(),
            },
          ],
          response: z.object({
            uuid: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let error;
    try {
      await zodmon.get("/path/:uuid", {
        params: { uuid: "e9e09a1-3967-4518-bc89-75a901aee128" },
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ZodmonError);
    expect((error as ZodmonError).cause).toBeInstanceOf(ZodError);
    expect((error as ZodmonError).message).toBe(
      "Zodmon: Invalid Path parameter 'uuid'"
    );
  });

  it("should not validate bad formatted responses", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          response: z.object({
            id: z.number(),
            name: z.string(),
            more: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let error: Error | undefined = undefined;
    try {
      await zodmon.get("/:id", { params: { id: 1 } });
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeInstanceOf(ZodmonError);
    expect((error as ZodmonError).cause).toBeInstanceOf(ZodError);
    expect((error as ZodmonError).message).toMatchSnapshot();
    expect((error as ZodmonError).data).toEqual({
      id: 1,
      name: "test",
    });
    expect((error as ZodmonError).config).toEqual({
      method: "get",
      url: "/:id",
      params: { id: 1 },
    });
  });

  it("should match Expected error", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          alias: "getError502",
          path: "/error502",
          response: z.void(),
          errors: [
            {
              status: 502,
              schema: z.object({
                error: z.object({
                  message: z.string(),
                }),
              }),
            },
            {
              status: 401,
              schema: z.object({
                error: z.object({
                  message: z.string(),
                  _401: z.literal(true),
                }),
              }),
            },
            {
              status: "default",
              schema: z.object({
                error: z.object({
                  message: z.string(),
                  _default: z.literal(true),
                }),
              }),
            },
          ],
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let error;
    try {
      await zodmon.get("/error502");
    } catch (e) {
      error = e;
    }
    type Test = ZodmonMatchingErrorsByPath<
      ApiOf<typeof zodmon>,
      "get",
      "/error502",
      MockProvider,
      ZodTypeProvider
    >;
    type Test2 = FindZodmonEndpointDefinitionByPath<
      ApiOf<typeof zodmon>,
      "get",
      "/error502"
    >["errors"];

    expect(error).toBeInstanceOf(Error);
    // @ts-ignore
    expect(error.response?.status).toBe(502);
    if (zodmon.isErrorFromPath("get", "/error502", error)) {
      expect(error.response.status).toBe(502);
      expect(error.response?.data).toEqual({
        error: { message: "bad gateway" },
      });
    }
    if (zodmon.isErrorFromAlias("getError502", error)) {
      expect(error.response.status).toBe(502);
      expect(error.response?.data).toEqual({
        error: { message: "bad gateway" },
      });
    }
  });

  it("should match error with params", async () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        alias: "getError401",
        path: "/error/:id/error401",
        response: z.void(),
        errors: [
          {
            status: 401,
            schema: z.object({}),
          },
        ],
      },
      {
        method: "get",
        alias: "getError404",
        path: "/error/:id/error404",
        response: z.void(),
        errors: [
          {
            status: 404,
            schema: z.object({}),
          },
        ],
      },
    ]);

    const params = {
      id: "test",
    };

    let error;
    try {
      await zodmon.getError401({ params });
    } catch (e) {
      error = e;
      console.log("Match Error params", e);
    }

    expect(zodmon.isErrorFromAlias("getError401", error)).toBe(true);
    expect(zodmon.isErrorFromAlias("getError404", error)).toBe(false);

    expect(zodmon.isErrorFromPath("get", "/error/:id/error401", error)).toBe(
      true
    );
    expect(zodmon.isErrorFromPath("get", "/error/:id/error404", error)).toBe(
      false
    );
  });

  it("should match error with empty params", async () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        alias: "getError401",
        path: "/error/:id/error401",
        response: z.void(),
        errors: [
          {
            status: 401,
            schema: z.object({}),
          },
        ],
      },
      {
        method: "get",
        alias: "getError404",
        path: "/error/:id/error404",
        response: z.void(),
        errors: [
          {
            status: 404,
            schema: z.object({}),
          },
        ],
      },
    ]);

    const params = {
      id: "",
    };

    let error;
    try {
      await zodmon.getError401({ params });
    } catch (e) {
      error = e;
    }

    expect(zodmon.isErrorFromAlias("getError401", error)).toBe(true);
    expect(zodmon.isErrorFromAlias("getError404", error)).toBe(false);

    expect(zodmon.isErrorFromPath("get", "/error/:id/error401", error)).toBe(
      true
    );
    expect(zodmon.isErrorFromPath("get", "/error/:id/error404", error)).toBe(
      false
    );
  });

  it("should match error with optional params at the end", async () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        alias: "getError401",
        path: "/error/:id/error401/:message",
        response: z.void(),
        errors: [
          {
            status: 401,
            schema: z.object({}),
          },
        ],
      },
      {
        method: "get",
        alias: "getError404",
        path: "/error/:id/error404/:message",
        response: z.void(),
        errors: [
          {
            status: 404,
            schema: z.object({}),
          },
        ],
      },
    ]);

    const params = {
      id: "test",
      message: "",
    };

    let error;
    try {
      await zodmon.getError401({ params });
    } catch (e) {
      error = e;
    }

    expect(zodmon.isErrorFromAlias("getError401", error)).toBe(true);
    expect(zodmon.isErrorFromAlias("getError404", error)).toBe(false);

    expect(
      zodmon.isErrorFromPath("get", "/error/:id/error401/:message", error)
    ).toBe(true);
    expect(
      zodmon.isErrorFromPath("get", "/error/:id/error404/:message", error)
    ).toBe(false);
  });

  it("should match Unexpected error", async () => {
    const zodmon = new ZodmonCore(`http://localhost`, [
      {
        method: "get",
        alias: "getError502",
        path: "/error502",
        response: z.void(),
      },
    ]);
    let error;
    try {
      await zodmon.get("/error502");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    // @ts-ignore
    expect(error.response?.status).toBe(502);
    expect(zodmon.isErrorFromPath("get", "/error502", error)).toBe(false);
    expect(zodmon.isErrorFromAlias("getError502", error)).toBe(false);
  });

  it("should return response when disabling validation", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/:id",
          response: z.object({
            id: z.number(),
            name: z.string(),
            more: z.string(),
          }),
        },
      ],
      { validate: false, fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.get("/:id", { params: { id: 1 } });
    const testResonseType: Assert<
      typeof response,
      { id: number; name: string; more: string }
    > = true;
    expect(response).toEqual({
      id: 1,
      name: "test",
    });
  });

  it("should trigger an error with error response", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "get",
          path: "/error502",
          response: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    try {
      await zodmon.get("/error502");
    } catch (e) {
      // @ts-ignore
      expect(e.response?.data).toEqual({
        error: {
          message: "bad gateway",
        },
      });
    }
  });

  it("should send a form data request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/form-data",
          requestFormat: "form-data",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.post("/form-data", {
      body: { id: 4, name: "post" },
    });
    const testResonseType: Assert<
      typeof response,
      { id: string; name: string }
    > = true;
    expect(response).toEqual({ id: "4", name: "post" });
  });

  it("should not send an array as form data request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/form-data",
          requestFormat: "form-data",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.array(z.string()),
            },
          ],
          response: z.string(),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let error: Error | undefined;
    let response: string | undefined;
    try {
      response = await zodmon.post("/form-data", { body: ["test", "test2"] });
    } catch (err) {
      error = err as Error;
    }
    expect(response).toBeUndefined();
    expect(error).toBeInstanceOf(ZodmonError);
    expect((error as ZodmonError).message).toBe(
      "Zodmon: multipart/form-data body must be an object"
    );
  });

  it("should send a form url request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/form-url",
          requestFormat: "form-url",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.object({
                id: z.number(),
                name: z.string(),
              }),
            },
          ],
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.post("/form-url", {
      body: { id: 4, name: "post" },
    });
    const testResonseType: Assert<
      typeof response,
      { id: string; name: string }
    > = true;
    expect(response).toEqual({ id: "4", name: "post" });
  });

  it("should not send an array as form url request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/form-url",
          requestFormat: "form-url",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.array(z.string()),
            },
          ],
          response: z.string(),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    let error: Error | undefined;
    let response: string | undefined;
    try {
      response = await zodmon.post("/form-url", { body: ["test", "test2"] });
    } catch (err) {
      error = err as Error;
    }
    expect(response).toBeUndefined();
    expect(error).toBeInstanceOf(ZodmonError);
    expect((error as ZodmonError).message).toBe(
      "Zodmon: application/x-www-form-urlencoded body must be an object"
    );
  });

  it("should send a text request", async () => {
    const zodmon = new ZodmonCore(
      `http://localhost`,
      [
        {
          method: "post",
          path: "/text",
          requestFormat: "text",
          parameters: [
            {
              name: "body",
              type: "Body",
              schema: z.string(),
            },
          ],
          response: z.string(),
        },
      ],
      { fetcherFactory: mockFetchFactory }
    );
    const response = await zodmon.post("/text", { body: "test" });
    const testResonseType: Assert<typeof response, string> = true;
    expect(response).toEqual("test");
  });
});
