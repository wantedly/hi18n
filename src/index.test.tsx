import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from "@jest/globals";
import { Translate } from "./index";

declare module "expect/build/types" {
  export interface Matchers<R, T> extends globalThis.jest.Matchers<R, T> {}
}

describe("Translate", () => {
  it("renders", () => {
    const { container } = render(<Translate />);

    expect(container).toHaveTextContent("Hello, world!");
  });
});
