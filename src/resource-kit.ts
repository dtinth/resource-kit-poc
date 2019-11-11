import { useRef, useEffect } from 'react'

export interface IResourceState<T> {
  loading: boolean
  outdated: boolean
  error?: Error
  data?: T
}

export interface IResourceReference<T> {
  typeName: string
  key: string
}

export class ResourceType<T> {
  constructor(public typeName: string) {}
  ref(key: string): IResourceReference<T> {
    return { typeName: this.typeName, key }
  }
}

/** Returns true if we need to fetch new data */
export function shouldFetch({
  loading,
  outdated,
}: Pick<IResourceState<any>, 'loading' | 'outdated'>) {
  return outdated && !loading
}

/** Takes a `resource` state and calls `onFetch` if it deems that data needs to be fetched. */
export function useResourceFetcher(
  resourceState: IResourceState<any>,
  onFetch: () => void,
) {
  const fetchRef = useRef(onFetch)
  const { loading, outdated } = resourceState
  useEffect(() => {
    fetchRef.current = onFetch
  }, [onFetch])
  useEffect(() => {
    if (shouldFetch({ loading, outdated })) {
      fetchRef.current()
    }
  }, [loading, outdated, fetchRef])
}
