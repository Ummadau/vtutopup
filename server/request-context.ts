import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextStore {
  userToken: string | null;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(userToken: string | null, fn: () => T): T {
  return requestContextStorage.run({ userToken }, fn);
}

export function getCurrentUserToken(): string | null {
  return requestContextStorage.getStore()?.userToken ?? null;
}
