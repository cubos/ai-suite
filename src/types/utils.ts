export type IsLiteral<T> = T extends string ? (string extends T ? never : T) : T;

export const tryCatch = <T, U = undefined>(f: (...args: unknown[]) => T, fb?: U) => {
  try {
    return f();
  } catch {
    return fb;
  }
};
