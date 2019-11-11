import { Reducer } from 'redux'

type ResourceManagerOptions = {
  selector: (state: any) => ResourceManagerState
}
type ResourceManagerState = {}
type ResourceManager = {
  reducer: Reducer<ResourceManagerState>
}

export function createResourceManager(
  options: ResourceManagerOptions,
): ResourceManager {
  const initialState: ResourceManagerState = {}

  const reducer: Reducer<ResourceManagerState> = (
    state = initialState,
    action,
  ) => {
    return state
  }

  return {
    reducer,
  }
}
