 <h1 align="center">Zodmon React</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodmon-react">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodmon-react/main/docs/logo.svg" width="128px" alt="Zodmon logo">
   </a>
 </p>
 
 <p align="center">
    React hooks for zodmon backed by <a src="https://react-query.tanstack.com/" >react-query</a>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@zodmon/react">
   <img src="https://img.shields.io/npm/v/@zodmon/react.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@zodmon/react">
   <img alt="npm" src="https://img.shields.io/npm/dw/@zodmon/react">
   </a>
   <a href="https://github.com/ecyrbe/zodmon-react/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/ecyrbe/zodmon-react">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/ecyrbe/zodmon-react/CI">
 </p>

# Install

```bash
> npm install @zodmon/react
```

or

```bash
> yarn add @zodmon/react
```

# Usage

Zodmon comes with a Query and Mutation hook helper.  
It's a thin wrapper around React-Query but with zodmon auto completion.

Zodmon query hook also returns an invalidation helper to allow you to reset react query cache easily

```typescript
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Zodmon, asApi } from "@zodmon/core";
import { ZodmonHooks } from "@zodmon/react";
import { z } from "zod";

// you can define schema before declaring the API to get back the type
const userSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .required();

const createUserSchema = z
  .object({
    name: z.string(),
  })
  .required();

const usersSchema = z.array(userSchema);

// you can then get back the types
type User = z.infer<typeof userSchema>;
type Users = z.infer<typeof usersSchema>;

const api = asApi([
  {
    method: "get",
    path: "/users",
    description: "Get all users",
    parameters: [
      {
        name: "q",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: usersSchema,
  },
  {
    method: "get",
    path: "/users/:id",
    description: "Get a user",
    response: userSchema,
  },
  {
    method: "post",
    path: "/users",
    description: "Create a user",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createUserSchema,
      },
    ],
    response: userSchema,
  },
]);
const baseUrl = "https://jsonplaceholder.typicode.com";

const zodmon = new Zodmon(baseUrl, api);
const zodmonHooks = new ZodmonHooks("jsonplaceholder", zodmon);

const Users = () => {
  const {
    data: users,
    isLoading,
    error,
    invalidate: invalidateUsers, // zodmon also provides invalidation helpers
  } = zodmonHooks.useQuery("/users");
  const { mutate } = zodmonHooks.useMutation("post", "/users", undefined, {
    onSuccess: () => invalidateUsers(),
  });

  return (
    <>
      <h1>Users</h1>
      <button onClick={() => mutate({ name: "john doe" })}>add user</button>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {(error as Error).message}</div>}
      {users && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </>
  );
};

// on another file
const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  );
};
```
