 <h1 align="center">Zodmon</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodmon">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodmon/main/docs/logo.svg" width="128px" alt="Zodmon logo">
   </a>
 </p>
 <p align="center">
    Zodmon is a typescript api client and an optional api server with auto-completion features backed by <a href="https://axios-http.com" >axios</a> and <a href="https://github.com/colinhacks/zod">zod</a> and <a href="https://expressjs.com/">express</a>
    <br/>
    <a href="https://www.zodmon.org/">Documentation</a>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@zodmon/core">
   <img src="https://img.shields.io/npm/v/@zodmon/core.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@zodmon/core">
   <img alt="npm" src="https://img.shields.io/npm/dw/@zodmon/core">
   </a>
   <a href="https://github.com/ecyrbe/zodmon/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/ecyrbe/zodmon">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/ecyrbe/zodmon/CI">
 </p>

https://user-images.githubusercontent.com/633115/185851987-554f5686-cb78-4096-8ff5-c8d61b645608.mp4

# What is it ?

It's an axios compatible API client and an optional expressJS compatible API server with the following features:

- really simple centralized API declaration
- typescript autocompletion in your favorite IDE for URL and parameters
- typescript response types
- parameters and responses schema thanks to zod
- response schema validation
- powerfull plugins like `fetch` adapter or `auth` automatic injection
- all axios features available
- `@tanstack/query` wrappers for react and solid (vue, svelte, etc, soon)
- all expressJS features available (middlewares, etc.)

**Table of contents:**

- [What is it ?](#what-is-it-)
- [Install](#install)
  - [Client and api definitions :](#client-and-api-definitions-)
  - [Server :](#server-)
- [How to use it on client side ?](#how-to-use-it-on-client-side-)
  - [Declare your API with zodmon](#declare-your-api-with-zodmon)
  - [API definition format](#api-definition-format)
- [Full documentation](#full-documentation)
- [Ecosystem](#ecosystem)
- [Roadmap](#roadmap)
- [Dependencies](#dependencies)

# Install

## Client and api definitions :

```bash
> npm install @zodmon/core
```

or

```bash
> yarn add @zodmon/core
```

## Server :

```bash
> npm install @zodmon/core @zodmon/express
```

or

```bash
> yarn add @zodmon/core @zodmon/express
```

# How to use it on client side ?

For an almost complete example on how to use zodmon and how to split your APIs declarations, take a look at [dev.to](examples/dev.to/) example.

## Declare your API with zodmon

Here is an example of API declaration with Zodmon.

```typescript
import { Zodmon } from "@zodmon/core";
import { z } from "zod";

const apiClient = new Zodmon(
  "https://jsonplaceholder.typicode.com",
  // API definition
  [
    {
      method: "get",
      path: "/users/:id", // auto detect :id and ask for it in apiClient get params
      alias: "getUser", // optionnal alias to call this endpoint with it
      description: "Get a user",
      response: z.object({
        id: z.number(),
        name: z.string(),
      }),
    },
  ]
);
```

Calling this API is now easy and has builtin autocomplete features :

```typescript
//   typed                     auto-complete path   auto-complete params
//     ▼                               ▼                   ▼
const user = await apiClient.get("/users/:id", { params: { id: 7 } });
console.log(user);
```

It should output

```js
{ id: 7, name: 'Kurtis Weissnat' }
```

You can also use aliases :

```typescript
//   typed                     alias   auto-complete params
//     ▼                        ▼                ▼
const user = await apiClient.getUser({ params: { id: 7 } });
console.log(user);
```

## API definition format

```typescript
type ZodmonEndpointDescriptions = Array<{
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string; // example: /posts/:postId/comments/:commentId
  alias?: string; // example: getPostComments
  immutable?: boolean; // flag a post request as immutable to allow it to be cached with react-query
  description?: string;
  requestFormat?: "json" | "form-data" | "form-url" | "binary" | "text"; // default to json if not set
  parameters?: Array<{
    name: string;
    description?: string;
    type: "Path" | "Query" | "Body" | "Header";
    schema: ZodSchema; // you can use zod `transform` to transform the value of the parameter before sending it to the server
  }>;
  response: ZodSchema; // you can use zod `transform` to transform the value of the response before returning it
  status?: number; // default to 200, you can use this to override the sucess status code of the response (only usefull for openapi and express)
  responseDescription?: string; // optional response description of the endpoint
  errors?: Array<{
    status: number | "default";
    description?: string;
    schema: ZodSchema; // transformations are not supported on error schemas
  }>;
}>;
```

# Full documentation

Check out the [full documentation](https://www.zodmon.org) or following shortcuts.

- [API definition](https://www.zodmon.org/docs/category/zodmon-api-definition)
- [Http client](https://www.zodmon.org/docs/category/zodmon-client)
- [React hooks](https://www.zodmon.org/docs/client/react)
- [Solid hooks](https://www.zodmon.org/docs/client/solid)
- [API server](http://www.zodmon.org/docs/category/zodmon-server)
- [Nextjs integration](http://www.zodmon.org/docs/server/next)

# Ecosystem

- [openapi-zod-client](https://github.com/astahmer/openapi-zod-client): generate a zodmon client from an openapi specification
- [@zodmon/express](https://github.com/ecyrbe/zodmon-express): full end to end type safety like tRPC, but for REST APIs
- [@zodmon/plugins](https://github.com/ecyrbe/zodmon-plugins) : some plugins for zodmon
- [@zodmon/react](https://github.com/ecyrbe/zodmon-react) : a react-query wrapper for zodmon
- [@zodmon/solid](https://github.com/ecyrbe/zodmon-solid) : a solid-query wrapper for zodmon

# Roadmap

The following will need investigation to check if it's doable :

- implement `@zodmon/nestjs` to define your API endpoints with nestjs and share it with your frontend (like tRPC)
- generate openAPI json from your API endpoints

You have other ideas ? [Let me know !](https://github.com/ecyrbe/zodmon/discussions)

# Dependencies

Zodmon even when working in pure Javascript is better suited to be working with Typescript Language Server to handle autocompletion.
So you should at least use the one provided by your IDE (vscode integrates a typescript language server)
However, we will only support fixing bugs related to typings for versions of Typescript Language v4.5
Earlier versions should work, but do not have TS tail recusion optimisation that impact the size of the API you can declare.

Also note that Zodmon do not embed any dependency. It's your Job to install the peer dependencies you need.

Internally Zodmon uses these libraries on all platforms :

- zod
- axios
