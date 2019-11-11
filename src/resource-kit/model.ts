import {
  IResourceReference,
  IResourceState,
  ResourceOptions,
  IResourceType,
} from './types'

/**
 * Represents a state of resource that has never been fetched.
 */
export const NULL_RESOURCE: IResourceState<any> = {
  loading: false,
  outdated: true,
}

/**
 * Represents a state of resource that has just been received for the first time without being fetched.
 * This may come from, e.g. a real-time update.
 */
export const FRESH_RESOURCE: IResourceState<any> = {
  loading: false,
  outdated: false,
}

/** This class represents a type of resource to be managed. */
export class ResourceType<T> implements IResourceType<T> {
  constructor(
    public typeName: string,
    public options: ResourceOptions<T> = {},
  ) {}
  ref(key: string): IResourceReference<T> {
    return { type: this, key }
  }
}

/** Returns true if we need to fetch new data */
export function shouldFetch({
  loading,
  outdated,
}: Pick<IResourceState<any>, 'loading' | 'outdated'>) {
  return outdated && !loading
}
