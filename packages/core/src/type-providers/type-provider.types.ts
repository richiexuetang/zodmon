export interface AnyZodmonTypeProvider<Schema = unknown> {
  schema: Schema;
  input: unknown;
  output: unknown;
}

export type InferInputTypeFromSchema<
  TypeProvider extends AnyZodmonTypeProvider,
  Schema
> = (TypeProvider & { schema: Schema })["input"];

export type InferOutputTypeFromSchema<
  TypeProvider extends AnyZodmonTypeProvider,
  Schema
> = (TypeProvider & { schema: Schema })["output"];

export type ZodmonValidateResult =
  | { success: true; data: any }
  | { success: false; error: any };

export interface ZodmonRuntimeTypeProvider<
  TypeProvider extends AnyZodmonTypeProvider
> {
  readonly _provider?: TypeProvider;
  validate: (schema: any, input: unknown) => ZodmonValidateResult;
  validateAsync: (schema: any, input: unknown) => Promise<ZodmonValidateResult>;
}
