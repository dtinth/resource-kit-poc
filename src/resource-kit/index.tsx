import {
  IResourceReference,
  LoadTransaction,
  ResourceFetchResult,
  ResourceFetchResultEntry,
  IResourceStateWithReference,
} from './types'
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import {
  ResourcesReduxState,
  getResourceState,
  ResourcesReduxAction,
} from './redux'
import { useStore, useSelector } from 'react-redux'
import { shouldFetch, ResourceType } from './model'
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

const loaderMap = new Map<ResourceType<any>, Set<string>>()

export function useResourceState<T>(
  reference: IResourceReference<T>,
): IResourceStateWithReference<T> {
  const store = useStore()
  const config = useContext(ConfigContext)!
  const resourceState = useSelector(state =>
    getResourceState(config.selectState(state), reference),
  )
  const { loading, outdated } = resourceState
  const referenceType = reference.type
  const key = reference.key
  useEffect(() => {
    const {
      batch = true,
      maxBatchSize = Infinity,
      load,
    } = referenceType.options
    if (shouldFetch({ loading, outdated }) && typeof load === 'function') {
      if (batch) {
        const existingBatch = loaderMap.get(referenceType)
        if (existingBatch && existingBatch.size < maxBatchSize) {
          existingBatch.add(key)
        } else {
          const newBatch = new Set<string>([key])
          loaderMap.set(referenceType, newBatch)
          setTimeout(() => {
            if (loaderMap.get(referenceType) === newBatch) {
              loaderMap.delete(referenceType)
            }
            runLoadTransaction(
              store as any,
              config,
              referenceType,
              Array.from(newBatch),
              load,
            )
          }, 16)
        }
      } else {
        runLoadTransaction(store as any, config, referenceType, [key], load)
      }
    }
  }, [loading, outdated, referenceType, key, store])
  return useMemo(
    () => ({
      ...resourceState,
      reference,
    }),
    [resourceState, reference],
  )
}

/**
 * Begins a loading transaction...
 */
async function runLoadTransaction(
  store: Store<any, ResourcesReduxAction>,
  config: ResourceKitConfig,
  resourceType: ResourceType<any>,
  keys: string[],
  fn: (keys: string[], tx: LoadTransaction) => PromiseLike<any[]>,
) {
  const state = config.selectState(store.getState())
  keys = keys.filter(key =>
    shouldFetch(getResourceState(state, resourceType.ref(key))),
  )
  if (keys.length === 0) return
  const references = keys.map(key => resourceType.ref(key))
  const startTime = Date.now()
  const toMapKey = ({ key, type }: IResourceReference<any>): string =>
    `${type.typeName}:${key}`
  store.dispatch({ type: 'Resource loading started', startTime, references })
  console.log('Begin fetching', references.map(toMapKey))
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
    const result = await fn(references.map(r => r.key), {
      receive(reference, item) {
        putResultEntry(reference, { status: 'completed', data: item })
      },
      error(reference, error) {
        putResultEntry(reference, { status: 'error', error })
      },
    })
    for (const [index, reference] of references.entries()) {
      if (index < result.length) {
        putResultEntry(reference, { status: 'completed', data: result[index] })
      } else {
        putResultEntry(reference, {
          status: 'error',
          error: new Error(
            `The fetching function did not return a result for ${reference.type} at key ${reference.key} (index ${index}).`,
          ),
        })
      }
    }
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
