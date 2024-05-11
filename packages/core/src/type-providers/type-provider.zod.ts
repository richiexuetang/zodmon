import {
  AnyZodmonTypeProvider,
  ZodmonRuntimeTypeProvider,
} from "./type-provider.types";

export interface ZodTypeProvider
  extends AnyZodmonTypeProvider<{ _input: unknown; _output: unknown }> {
  input: this["schema"]["_input"];
  output: this["schema"]["_output"];
}

export const zodTypeProvider: ZodmonRuntimeTypeProvider<ZodTypeProvider> = {
  validate: (schema, input) => schema.safeParse(input),
  validateAsync: (schema, input) => schema.safeParseAsync(input),
};
