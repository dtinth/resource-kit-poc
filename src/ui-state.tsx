import { AnyAction } from 'redux'
import { useSelector, useDispatch } from 'react-redux'
import { useMemo, Dispatch } from 'react'

export type UIState = {
  currentProjectId: string | null
  currentTaskId: string | null
}

export type UIAction =
  | { type: 'View project'; projectId: string }
  | { type: 'View task'; taskId: string }

export function uiStateReducer(
  state: UIState = { currentProjectId: null, currentTaskId: null },
  action: AnyAction,
): UIState {
  if (action.type === 'View project')
    return { ...state, currentProjectId: action.projectId }
  if (action.type === 'View task')
    return { ...state, currentTaskId: action.taskId }
  return state
}

export function useUIState(): UIState {
  return useSelector((state: any) => state.uiState)
}
export function useUIStateMutator() {
  const dispatch = useDispatch<Dispatch<UIAction>>()
  return useMemo(() => {
    return {
      viewProject: (projectId: string) =>
        dispatch({ type: 'View project', projectId }),
      viewTask: (taskId: string) => dispatch({ type: 'View task', taskId }),
    }
  }, [])
}
