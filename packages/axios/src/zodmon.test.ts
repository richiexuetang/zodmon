/// <reference lib="dom" />
import { AxiosError } from "axios";
import express from "express";
import { AddressInfo } from "net";
import { z, ZodError } from "zod";
//if (globalThis.FormData === undefined) {
globalThis.FormData = require("form-data");
//}
import { Zodmon } from "./zodmon";
import {
  ZodmonError,
  AnyZodmonFetcherProvider,
  ZodmonPlugin,
  apiBuilder,
} from "@zodmon/core";
import multer from "multer";
import { Assert } from "@zodmon/core/lib/utils.types";
import { AxiosProvider } from "./axios-provider";

const multipart = multer({ storage: multer.memoryStorage() });

describe("Zodmon", () => {
  let app: express.Express;
  let server: ReturnType<typeof app.listen>;
  let port: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.get("/token", (req, res) => {
      res.status(200).json({ token: req.headers.authorization });
    });
    app.post("/token", (req, res) => {
      res.status(200).json({ token: req.headers.authorization });
    });
    app.get("/error401", (req, res) => {
      res.status(401).json({});
    });
    app.get("/error502", (req, res) => {
      res.status(502).json({ error: { message: "bad gateway" } });
    });
    app.get("/queries", (req, res) => {
      res.status(200).json({
        queries: req.query.id,
      });
    });
    app.get("/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id), name: "test" });
    });
    app.get("/path/:uuid", (req, res) => {
      res.status(200).json({ uuid: req.params.uuid });
    });
    app.get("/:id/address/:address", (req, res) => {
      res
        .status(200)
        .json({ id: Number(req.params.id), address: req.params.address });
    });
    app.post("/", (req, res) => {
      res.status(200).json({ id: 3, name: req.body.name });
    });
    app.put("/", (req, res) => {
      res.status(200).json({ id: req.body.id, name: req.body.name });
    });
    app.patch("/", (req, res) => {
      res.status(200).json({ id: req.body.id, name: req.body.name });
    });
    app.delete("/:id", (req, res) => {
      res.status(200).json({ id: Number(req.params.id) });
    });
    app.post("/form-data", multipart.none(), (req, res) => {
      res.status(200).json(req.body);
    });
    app.post(
      "/form-url",
      express.urlencoded({ extended: false }),
      (req, res) => {
        res.status(200).json(req.body);
      }
    );
    app.post("/text", express.text(), (req, res) => {
      res.status(200).send(req.body);
    });
    server = app.listen(0);
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => {
    server.close();
  });

  it("should be defined", () => {
    expect(Zodmon).toBeDefined();
  });

  it("should throw if baseUrl is not provided", () => {
    // @ts-ignore
    expect(() => new Zodmon(undefined, [])).toThrowError(
      "Zodmon: missing base url"
    );
  });

  it("should throw if api is not provided", () => {
    // @ts-ignore
    expect(() => new Zodmon()).toThrowError("Zodmon: missing api description");
  });

  it("should throw if api is not an array", () => {
    // @ts-ignore
    expect(() => new Zodmon({})).toThrowError("Zodmon: api must be an array");
  });

  it("should create a new instance of Zodmon", () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, []);
    expect(zodmon).toBeDefined();
  });
  it("should create a new instance when providing an api", () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
        new Zodmon(`http://localhost:${port}`, [
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
    const zodmon = new Zodmon([
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

  it("should make an http request", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.request({
      method: "get",
      url: "/:id",
      params: { id: 7 },
    });
    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make an http get with standard query arrays", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.get("/queries", { queries: { id: [1, 2] } });
    expect(response).toEqual({ queries: ["1", "2"] });
  });

  it("should make an http get with one path params", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    const response = await zodmon.get("/:id", { params: { id: 7 } });
    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make an http alias request with one path params", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/:id",
        alias: "getById",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    const response = await zodmon.getById({ params: { id: 7 } });
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
    const zodmon = new Zodmon(`http://localhost:${port}`, api);
    const response = await zodmon.getById({ params: { id: 7 } });
    expect(response).toEqual({ id: 7, name: "test" });
  });

  it("should make a get request with forgotten params and get back a zod error", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    try {
      // @ts-ignore
      await zodmon.get("/:id");
    } catch (e) {
      expect(e).toBeInstanceOf(ZodmonError);
    }
  });

  it("should make an http get with multiples path params", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/:id/address/:address",
        response: z.object({
          id: z.number(),
          address: z.string(),
        }),
      },
    ]);
    const response = await zodmon.get("/:id/address/:address", {
      params: { id: 7, address: "address" },
    });
    expect(response).toEqual({ id: 7, address: "address" });
  });

  it("should make an http post with body param", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.post("/", { body: { name: "post" } });
    expect(response).toEqual({ id: 3, name: "post" });
  });

  it("should make an http post with transformed body param", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const config = {
      method: "post",
      url: "/",
      body: { firstname: "post", lastname: "test" },
    } as const;
    const response = await zodmon.request(config);
    expect(config).toEqual({
      method: "post",
      url: "/",
      body: { firstname: "post", lastname: "test" },
    });
    expect(response).toEqual({ id: 3, name: "post test" });
  });

  it("should throw a zodmon error if params are not correct", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
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
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.create({ body: { name: "post" } });
    expect(response).toEqual({ id: 3, name: "post" });
  });

  it("should make an http put", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.put("/", { body: { id: 5, name: "put" } });
    expect(response).toEqual({ id: 5, name: "put" });
  });

  it("should make an http put alias", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.update({ body: { id: 5, name: "put" } });
    expect(response).toEqual({ id: 5, name: "put" });
  });

  it("should make an http patch", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.patch("/", {
      body: { id: 4, name: "patch" },
    });
    expect(response).toEqual({ id: 4, name: "patch" });
  });

  it("should make an http patch alias", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.update({ body: { id: 4, name: "patch" } });
    expect(response).toEqual({ id: 4, name: "patch" });
  });

  it("should make an http delete", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "delete",
        path: "/:id",
        response: z.object({
          id: z.number(),
        }),
      },
    ]);
    const response = await zodmon.delete("/:id", {
      params: { id: 6 },
    });
    expect(response).toEqual({ id: 6 });
  });

  it("should make an http delete alias", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "delete",
        path: "/:id",
        alias: "remove",
        response: z.object({
          id: z.number(),
        }),
      },
    ]);
    const response = await zodmon.remove({
      params: { id: 6 },
    });
    expect(response).toEqual({ id: 6 });
  });

  it("should validate uuid in path params", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.get("/path/:uuid", {
      params: { uuid: "e9e09a1d-3967-4518-bc89-75a901aee128" },
    });
    expect(response).toEqual({
      uuid: "e9e09a1d-3967-4518-bc89-75a901aee128",
    });
  });

  it("should not validate bad path params", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
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
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/:id",
        response: z.object({
          id: z.number(),
          name: z.string(),
          more: z.string(),
        }),
      },
    ]);
    try {
      await zodmon.get("/:id", { params: { id: 1 } });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodmonError);
      expect((e as ZodmonError).cause).toBeInstanceOf(ZodError);
      expect((e as ZodmonError).message)
        .toBe(`Zodmon: Invalid response from endpoint 'get /:id'
status: 200 OK
cause:
[
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "more"
    ],
    "message": "Required"
  }
]
received:
{
  "id": 1,
  "name": "test"
}`);
      expect((e as ZodmonError).data).toEqual({
        id: 1,
        name: "test",
      });
      expect((e as ZodmonError).config).toEqual({
        method: "get",
        url: "/:id",
        params: { id: 1 },
      });
    }
  });

  it("should match Expected error", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    let error;
    try {
      await zodmon.get("/error502");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as AxiosError).response?.status).toBe(502);
    if (zodmon.isErrorFromPath("get", "/error502", error)) {
      expect(error.response.status).toBe(502);
      if (error.response.status === 502) {
        const data = error.response.data;
        const test: Assert<typeof data, { error: { message: string } }> = true;
      }
      expect(error.response?.data).toEqual({
        error: { message: "bad gateway" },
      });
    }
    if (zodmon.isErrorFromAlias("getError502", error)) {
      expect(error.response.status).toBe(502);
      if (error.response.status === 502) {
        const data = error.response.data;
        //     ^?
        const test: Assert<typeof data, { error: { message: string } }> = true;
      } else if (error.response.status === 401) {
        const data = error.response.data;
        //     ^?
        const test: Assert<
          typeof data,
          { error: { message: string; _401: true } }
        > = true;
      } else {
        const testStatus = error.response.status;
        //        ^?
        const data = error.response.data;
        //     ^?
        const test: Assert<
          typeof data,
          { error: { message: string; _default: true } }
        > = true;
      }
      expect(error.response?.data).toEqual({
        error: { message: "bad gateway" },
      });
    }
  });

  it("should match Unexpected error", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    expect((error as AxiosError).response?.status).toBe(502);
    expect(zodmon.isErrorFromPath("get", "/error502", error)).toBe(false);
    expect(zodmon.isErrorFromAlias("getError502", error)).toBe(false);
  });

  it("should return response when disabling validation", async () => {
    const zodmon = new Zodmon(
      `http://localhost:${port}`,
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
      { validate: false }
    );
    const response = await zodmon.get("/:id", { params: { id: 1 } });
    expect(response).toEqual({
      id: 1,
      name: "test",
    });
  });

  it("should trigger an axios error with error response", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
      {
        method: "get",
        path: "/error502",
        response: z.object({
          id: z.number(),
          name: z.string(),
        }),
      },
    ]);
    try {
      await zodmon.get("/error502");
    } catch (e) {
      expect((e as AxiosError).response?.data).toEqual({
        error: {
          message: "bad gateway",
        },
      });
    }
  });

  it("should send a form data request", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.post("/form-data", {
      body: { id: 4, name: "post" },
    });
    expect(response).toEqual({ id: "4", name: "post" });
  });

  it("should not send an array as form data request", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
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
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.post("/form-url", {
      body: { id: 4, name: "post" },
    });
    expect(response).toEqual({ id: "4", name: "post" });
  });

  it("should not send an array as form url request", async () => {
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
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
    const zodmon = new Zodmon(`http://localhost:${port}`, [
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
    ]);
    const response = await zodmon.post("/text", { body: "test" });
    expect(response).toEqual("test");
  });
});
