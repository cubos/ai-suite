export interface RetryOptions {
    attempts: number;
    delay?: (attempt: number) => number;
}