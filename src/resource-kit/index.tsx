import {
  IResourceReference,
  IResourceState,
  IResourceFetcher,
  LoadTransaction,
  ResourceFetchResult,
  ResourceFetchResultEntry,
} from './types'
import React, { createContext, ReactNode, useContext, useEffect } from 'react'
import {
  ResourcesReduxState,
  getResourceState,
  ResourcesReduxAction,
} from './redux'
import { useStore, useSelector } from 'react-redux'
import { shouldFetch } from './model'
import { Store } from 'redux'

export * from './types'
export { ResourceType } from './model'
export { resourcesReducer } from './redux'

export type ResourceKitConfig = {
  selectState: (storeState: any) => ResourcesReduxState
}

const ConfigContext = createContext<ResourceKitConfig | null>(null)

export function ResourceManagerProvider(props: {
  config: ResourceKitConfig
  children: ReactNode
}) {
  return (
    <ConfigContext.Provider value={props.config}>
      {props.children}
    </ConfigContext.Provider>
  )
}

export function useResourceState<T>(
  reference: IResourceReference<T>,
  fetcher: IResourceFetcher<T>,
): IResourceState<T> {
  const store = useStore()
  const config = useContext(ConfigContext)!
  const resourceState = useSelector(state =>
    getResourceState(config.selectState(state), reference),
  )
  const { loading, outdated } = resourceState
  useEffect(() => {
    if (shouldFetch({ loading, outdated })) {
      fetcher({
        reference,
        async beginLoadTransaction(references, transactionHandler) {
          await runLoadTransaction(store as any, references, transactionHandler)
        },
      })
    }
  }, [loading, outdated, fetcher, store])
  return resourceState
}

/**
 * Begins a loading transaction...
 */
async function runLoadTransaction(
  store: Store<any, ResourcesReduxAction>,
  references: IResourceReference<any>[],
  fn: (tx: LoadTransaction) => PromiseLike<void>,
) {
  const startTime = Date.now()
  const toMapKey = ({ key, typeName }: IResourceReference<any>): string =>
    `${key}:${typeName}`
  store.dispatch({ type: 'Resource loading started', startTime, references })
  const defaultResult: ResourceFetchResult = {
    status: 'error',
    error: new Error(
      `The fetching function did not return a result for this resource.`,
    ),
  }
  const resultEntryMap = new Map<string, ResourceFetchResultEntry>()
  const unusedReferences = new Map<string, IResourceReference<any>>(
    references.map(r => [toMapKey(r), r] as [string, IResourceReference<any>]),
  )
  const putResultEntry = (
    reference: IResourceReference<any>,
    result: ResourceFetchResult,
  ) => {
    const mapKey = toMapKey(reference)
    resultEntryMap.set(mapKey, {
      reference,
      result,
    })
    unusedReferences.delete(mapKey)
  }
  try {
    await fn({
      receive(reference, item) {
        putResultEntry(reference, { status: 'completed', data: item })
      },
      error(reference, error) {
        putResultEntry(reference, { status: 'error', error })
      },
    })
  } catch (error) {
    defaultResult.error = error
    throw error
  } finally {
    for (const reference of Array.from(unusedReferences.values())) {
      putResultEntry(reference, defaultResult)
    }
    const finishTime = Date.now()
    const resultEntries = Array.from(resultEntryMap.values())
    store.dispatch({
      type: 'Resource received',
      finishTime,
      startTime,
      resultEntries,
    })
  }
}
