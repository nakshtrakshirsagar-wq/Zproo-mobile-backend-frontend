import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import { toast } from '../utils/toast';

/** Mutation with a default error toast (the server already returns a user-friendly message). */
export function useAction<TData, TVars = void>(fn: (v: TVars) => Promise<TData>, opts?: Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'>) {
  return useMutation<TData, ApiError, TVars>({
    mutationFn: fn,
    ...opts,
    onError: (...args: any[]) => { if (opts?.onError) (opts.onError as any)(...args); else toast(args[0].message, 'error'); },
  });
}
