export const promiseWithTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`[promiseWithTimeout] timeout of ${timeoutMs}ms exceeded`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};
