export const promiseWithTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`[promiseWithTimeout] timeout of ${timeout}ms exceeded`));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
};
