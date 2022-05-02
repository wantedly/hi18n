// eslint-disable-next-line node/no-unpublished-import
import type { TransformOptions } from "@babel/core";
declare module "@typescript-eslint/types" {
  interface ParserOptions {
    babelOptions?: TransformOptions | undefined;
  }
}
export {};
