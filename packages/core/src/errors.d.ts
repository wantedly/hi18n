export {};

declare global {
  interface ErrorConstructor {
    // eslint-disable-next-line @typescript-eslint/ban-types
    captureStackTrace?(targetObject: Error, constructorOpt?: Function): void;
  }
}
