import Immutable from 'immutable'
import {
  IResourceState,
  IResourceReference,
  ResourceFetchResultEntry,
  LoadTransaction,
  ResourceFetchResult,
} from './types'
import { Reducer, Store } from 'redux'
import { NULL_RESOURCE, FRESH_RESOURCE } from './model'

/**
 * Redux backend for resource-kit (implementation detail).
 */

/**
 * Data model for Redux store: 2-level map with key of `typeName` -> `key`.
 */
export type ResourcesReduxState = Immutable.Map<
  string,
  Immutable.Map<string, IResourceState<any>>
>

export type ResourcesReduxAction =
  | {
      type: 'Resource loading started'
      startTime: number
      references: IResourceReference<any>[]
    }
  | {
      type: 'Resource received'
      finishTime: number
      startTime: number
      resultEntries: ResourceFetchResultEntry[]
    }

export const resourcesReducer: Reducer<
  ResourcesReduxState,
  ResourcesReduxAction
> = (state = Immutable.Map(), action) => {
  switch (action.type) {
    case 'Resource loading started':
      return state.withMutations(m => {
        for (const reference of action.references) {
          const keyPath = [reference.typeName, reference.key]
          m.setIn(keyPath, {
            ...(m.getIn(keyPath) || NULL_RESOURCE),
            outdated: false,
            loading: true,
          })
        }
      })
    case 'Resource received':
      return state.withMutations(m => {
        for (const { reference, result } of action.resultEntries) {
          const keyPath = [reference.typeName, reference.key]
          m.setIn(keyPath, {
            ...(m.getIn(keyPath) || FRESH_RESOURCE),
            loading: false,
            ...(result.status === 'completed'
              ? { error: undefined, data: result.data }
              : { error: result.error }),
          })
        }
      })
    default:
      return state
  }
}

/**
 * Selects a resource state from Redux store state.
 */
export function getResourceState<T>(
  state: ResourcesReduxState,
  reference: IResourceReference<T>,
): IResourceState<T> {
  return state.getIn([reference.typeName, reference.key]) || NULL_RESOURCE
}
