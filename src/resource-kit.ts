import { AnyAction } from 'redux'

type ResourceManagerOptions = {
  selector: (state: any) => ResourceManagerState
}
type ResourceManagerState = {}

export function createResourceManager(options: ResourceManagerOptions) {
  function reducer(
    state: ResourceManagerState,
    action: AnyAction,
  ): ResourceManagerState {
    return state
  }

  return {
    reducer,
  }
}
