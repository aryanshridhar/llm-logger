import type { ChatFinal } from "./types.js";

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
}

export function deferChatCompletion(): Deferred<ChatFinal> {
  let resolve!: (value: ChatFinal) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<ChatFinal>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
