 <h1 align="center">Zodmon</h1>
 <p align="center">
   <a href="https://github.com/richiexuetang/zodmon">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodmon/main/docs/logo.svg" width="128px" alt="Zodmon logo">
   </a>
 </p>
 <p align="center">
    Zodmon is a typescript api client and an optional api server with auto-completion features including <a href="https://axios-http.com" >axios</a> and <a href="https://github.com/colinhacks/zod">zod</a>
    <br/>
 </p>
 
# What is it ?

It's an axios compatible API client compatible API server with the following features:

- centralized API declaration and contracts
- typescript!
- parameters and responses schema thanks to zod (w/ validation)
- powerful plugins like `fetch` adapter or `auth` automatic injection
- all axios features available
- `@tanstack/query` wrappers for react

**Table of contents:**

- [What is it ?](#what-is-it-)
- [Install](#install)
  - [Client and api definitions :](#client-and-api-definitions-)
  - [Server :](#server-)
- [How to use it on client side ?](#how-to-use-it-on-client-side-)
  - [Declare your API with zodmon](#declare-your-api-with-zodmon)
  - [API definition format](#api-definition-format)

# Install

## Client and api definitions :

```bash
> npm install @zodmon/core
```

or

```bash
> yarn add @zodmon/core
```

or

```bash
> pnpm add @zodmon/core
```

## Declare your API with zodmon

Here is an example of API declaration with zodmon.

```typescript
import { zodmon } from "@zodmon/core";
import { z } from "zod";

const apiClient = new zodmon(
  "https://jsonplaceholder.typicode.com",
  // API definition
  [
    {
      method: "get",
      path: "/users/:id", // auto detect :id and ask for it in apiClient get params
      alias: "getUser", // optional alias to call this endpoint with it
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
const user = await apiClient.get("/sorcerers/:id", { params: { id: 2 } });
console.log(sorcerer);
```

It should output

```js
{ id: 7, name: 'Gojo Satoru' }
```

You can also use aliases :

```typescript
//   typed                        alias    auto-complete params
//     ▼                            ▼                ▼
const sorcerer = await apiClient.getSorcerer({ params: { id: 2 } });
console.log(sorcerer);
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
  status?: number; // default to 200, you can use this to override the success status code of the response (only useful for openApi)
  responseDescription?: string; // optional response description of the endpoint
  errors?: Array<{
    status: number | "default";
    description?: string;
    schema: ZodSchema; // transformations are not supported on error schemas
  }>;
}>;
```
