import React, { useEffect, useRef, ReactNode, Fragment } from 'react'
import ReactDOM from 'react-dom'
import './styles.css'
import {
  createStore,
  combineReducers,
  Reducer,
  AnyAction,
  Store,
  applyMiddleware,
} from 'redux'
import {
  ResourceType,
  useResourceFetcher,
  IResourceState,
  shouldFetch,
  IResourceReference,
} from './resource-kit'
import { Provider, useSelector, useStore } from 'react-redux'
import Immutable from 'immutable'
import logger from 'redux-logger'

type ProjectList = { projectIds: string[] }
const projectListResources = new ResourceType<ProjectList>('ProjectList')

type Project = { _id: string; title: string }
const projectResources = new ResourceType<Project>('Project')

const NULL_RESOURCE: IResourceState<any> = {
  loading: false,
  outdated: true,
}
const FRESH_RESOURCE: IResourceState<any> = {
  loading: false,
  outdated: false,
}

function selectResourceState<T>(reference: IResourceReference<T>) {
  return (state: any): IResourceState<T> => {
    return (
      state.resources.getIn([reference.typeName, reference.key]) ||
      NULL_RESOURCE
    )
  }
}

/**
 * Begins a loading transaction
 */
async function loadIntoStore(
  store: Store<any, ResourcesAction>,
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

type LoadTransaction = {
  receive<T>(reference: IResourceReference<T>, data: T): void
  error<T>(reference: IResourceReference<T>, error: Error): void
}

async function fetchAllProjects() {
  await new Promise(r => setTimeout(r, 500))
  return [
    { _id: 'a', title: 'Project A' },
    { _id: 'b', title: 'Project B' },
    { _id: 'c', title: 'Project C' },
  ]
}

function useProjectList() {
  const store = useStore<any, ResourcesAction>()
  const ref = projectListResources.ref('*')
  const state = useSelector(selectResourceState(ref))
  useResourceFetcher(state, () => {
    loadIntoStore(store, [ref], async tx => {
      const projects = await fetchAllProjects()
      tx.receive(ref, { projectIds: projects.map(p => p._id) })
      for (const p of projects) {
        tx.receive(projectResources.ref(p._id), p)
      }
    })
  })
  return state
}

function useProject(projectId: string) {
  const ref = projectResources.ref(projectId)
  const state = useSelector(selectResourceState(ref))
  useResourceFetcher(state, () => {})
  return state
}

type ResourcesState = Immutable.Map<
  string,
  Immutable.Map<string, IResourceState<any>>
>

type ResourceFetchResult =
  | { status: 'completed'; data: any }
  | { status: 'error'; error: Error }
type ResourceFetchResultEntry = {
  reference: IResourceReference<any>
  result: ResourceFetchResult
}

type ResourcesAction =
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

const resourcesReducer: Reducer<ResourcesState, ResourcesAction> = (
  state = Immutable.Map(),
  action,
) => {
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

function App() {
  return (
    <div className="p-4">
      <h1>resource-kit demo</h1>
      <div className="flex mb-4">
        <div className="w-1/4 bg-gray-400 p-4">
          Project list
          <ProjectList />
        </div>
        <div className="w-1/2 bg-gray-500 p-4">Tasks in project</div>
        <div className="w-1/4 bg-gray-400 p-4">Task information</div>
      </div>
    </div>
  )
}

function ProjectList() {
  const listState = useProjectList()
  return (
    <div>
      {listState.data && (
        <ul className="bg-white p-2">
          {listState.data.projectIds.map(id => {
            return (
              <li key={id}>
                <button className="block w-full border border-white rounded hover:border-gray-200 bg-white text-blue-500 hover:bg-gray-200 py-2 px-4">
                  <ProjectStateConnector projectId={id}>
                    {ps => (ps.data && ps.data.title) || `Project ${id}`}
                  </ProjectStateConnector>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProjectStateConnector(props: {
  projectId: string
  children: (state: IResourceState<Project>) => ReactNode
}) {
  const state = useProject(props.projectId)
  return <Fragment>{props.children(state)}</Fragment>
}

const reducer = combineReducers({
  resources: resourcesReducer,
})
const store = createStore(reducer, applyMiddleware(logger))

const rootElement = document.getElementById('root')
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement,
)
