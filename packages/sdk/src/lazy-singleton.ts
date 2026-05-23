export function lazyAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => {
    if (!promise) {
      promise = factory();
    }
    return promise;
  };
}
