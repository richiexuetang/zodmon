import type { Config } from "@jest/types";

// Objet synchrone
const config: Config.InitialOptions = {
  verbose: true,
  moduleFileExtensions: ["ts", "js", "tsx", "jsx", "json", "node"],
  rootDir: "./",
  testRegex: ".(spec|test).tsx?$",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules/axios/.+\\.(j|t)sx?$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!axios/.*)"],
  coverageDirectory: "./coverage",
  testEnvironment: "jsdom",
};
export default config;
