import type { Config } from "@jest/types";

// Objet synchronize
const config: Config.InitialOptions = {
  verbose: true,
  moduleFileExtensions: ["ts", "js", "json", "node"],
  rootDir: "./",
  testRegex: ".(spec|test).tsx?$",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  coverageDirectory: "./coverage",
  testEnvironment: "node",
};
export default config;
