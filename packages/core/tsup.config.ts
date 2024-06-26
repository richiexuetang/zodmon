import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts", "src/utils.types.ts", "src/zodmon.types.ts"],
  outDir: "lib",
  format: ["cjs", "esm"],
  minify: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  splitting: true,
  sourcemap: false,
});
