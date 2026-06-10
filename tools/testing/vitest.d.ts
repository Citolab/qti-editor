import 'vitest';
import 'storybook/test';

interface CustomMatchers<R = unknown> {
  toEqualXml: (expected: string) => R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Storybook's `expect` (used in story `play` functions) derives its assertion
// type from @vitest/expect's `JestAssertion`, which extends the global
// `jest.Matchers` namespace. Augmenting that global namespace makes the matcher
// resolve regardless of which @vitest/expect copy storybook resolves.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toEqualXml(expected: string): R;
    }
  }
}
