export function validateName(name: string | number): void {
  if (typeof name === "number") {
    if (!Number.isInteger(name)) {
      throw new TypeError(`Not a valid name: non-integer number ${name}`);
    } else if (name < 0 || (name === 0 && Object.is(name, -0))) {
      throw new RangeError(`Not a valid name: negative number ${name}`);
    } else if (name > Number.MAX_SAFE_INTEGER) {
      throw new RangeError(
        `Not a valid name: number ${name} exceeds Number.MAX_SAFE_INTEGER`,
      );
    }
  } else if (typeof name === "string") {
    if (!/^[A-Z_a-z][0-9A-Z_a-z]*$/.test(name)) {
      throw new RangeError(`Not a valid name: ${JSON.stringify(name)}`);
    }
  } else {
    throw new TypeError(
      `Not a valid name: neither a number or a string: ${name as string}`,
    );
  }
}

export function coerceStringOrUndefined<S extends string>(
  value: S | undefined,
): S | undefined {
  if (value === undefined) {
    return undefined;
  }
  return `${value}` as S;
}
export function coerceNumberOrUndefined<N extends number>(
  value: N | undefined,
): N | undefined {
  if (value === undefined) {
    return undefined;
  }
  return +value as N;
}
