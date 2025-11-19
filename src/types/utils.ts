export type IsLiteral<T> = T extends string ? (string extends T ? never : T) : T;
