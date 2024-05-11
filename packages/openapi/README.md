 <h1 align="center">Zodmon Openapi</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodmon-openapi">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodmon-openapi/main/docs/logo.svg" width="128px" alt="Zodmon logo">
   </a>
 </p>
 <p align="center">
    Zodmon Openapi is an openapi generator for zodmon api description format.
    <br/>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@zodmon/openapi">
   <img src="https://img.shields.io/npm/v/@zodmon/openapi.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@zodmon/openapi">
   <img alt="npm" src="https://img.shields.io/npm/dw/@zodmon/openapi">
   </a>
   <a href="https://github.com/ecyrbe/zodmon-openapi/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/ecyrbe/zodmon-openapi">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/ecyrbe/zodmon-openapi/CI">
 </p>

# What is it ?

It's an openapi generator for zodmon api description format.

- really simple centralized API declaration
- generate openapi v3 json schema

**Table of contents:**

- [What is it ?](#what-is-it-)
- [Install](#install)
- [How to use it ?](#how-to-use-it-)
  - [Declare your API for fullstack end to end type safety](#declare-your-api-for-fullstack-end-to-end-type-safety)
  - [Expose your OpenAPI documentation](#expose-your-openapi-documentation)

# Install

```bash
> npm install @zodmon/openapi
```

or

```bash
> yarn add @zodmon/openapi
```

# How to use it ?

Openapi is a specification for describing REST APIs. It's a standard that is widely used in the industry. It's a great way to document your API and zodmon-openapi is a tool to generate openapi v3 json schema from zodmon api description format.

## Declare your API for fullstack end to end type safety

Here is an example of API declaration with Zodmon. Splitted between public and admin API.

in a common directory (ex: `src/api.ts`) :

```typescript
import { makeApi } from "@zodmon/core";
import { z } from "zod";

export const userApi = makeApi([
  {
    method: "get",
    path: "/users",
    alias: "getUsers",
    description: "Get all users",
    parameters: [
      {
        name: "limit",
        type: "Query",
        description: "Limit the number of users",
        schema: z.number().positive(),
      },
      {
        name: "offset",
        type: "Query",
        description: "Offset the number of users",
        schema: z.number().positive().optional(),
      },
    ],
    response: z.array(userSchema),
    errors,
  },
  {
    method: "get",
    path: "/users/:id",
    alias: "getUser",
    description: "Get a user by id",
    response: userSchema,
    errors,
  },
  {
    method: "get",
    path: "/users/:id/comments",
    alias: "getComments",
    description: "Get all user comments",
    response: z.array(commentSchema),
    errors,
  },
  {
    method: "get",
    path: "/users/:id/comments/:commentId",
    alias: "getComment",
    description: "Get a user comment by id",
    response: commentSchema,
    errors,
  },
]);

export const adminApi = makeApi([
  {
    method: "post",
    path: "/users",
    alias: "createUser",
    description: "Create a user",
    parameters: [
      {
        name: "user",
        type: "Body",
        description: "The user to create",
        schema: userSchema.omit({ id: true }),
      },
    ],
    response: userSchema,
    errors,
  },
  {
    method: "put",
    path: "/users/:id",
    alias: "updateUser",
    description: "Update a user",
    parameters: [
      {
        name: "user",
        type: "Body",
        description: "The user to update",
        schema: userSchema,
      },
    ],
    response: userSchema,
    errors,
  },
  {
    method: "delete",
    path: "/users/:id",
    alias: "deleteUser",
    description: "Delete a user",
    response: z.void(),
    status: 204,
    errors,
  },
]);
```

## Expose your OpenAPI documentation

in your backend (ex: `src/server.ts`) :

```typescript
import { serve, setup } from "swagger-ui-express";
import { makeApi } from "@zodmon/core";
import { zodmonApp, zodmonRouter } from "@zodmon/express";
import { bearerAuthScheme, openApiBuilder } from "@zodmon/openapi";
import { userApi, adminApi } from "./api";

const app = zodmonApp();
const userRouter = zodmonRouter([...userApi, ...adminApi]);

app.use("/api/v1", userRouter);

const document = openApiBuilder({
  title: "User API",
  version: "1.0.0",
  description: "A simple user API",
})
  .addServer({ url: "/api/v1" })
  .addSecurityScheme("admin", bearerAuthScheme())
  .addPublicApi(api)
  .addProtectedApi("admin", adminApi)
  .build();

app.use(`/docs/swagger.json`, (_, res) => res.json(document));
app.use("/docs", serve);
app.use("/docs", setup(undefined, { swaggerUrl: "/docs/swagger.json" }));

app.listen(3000);
```
