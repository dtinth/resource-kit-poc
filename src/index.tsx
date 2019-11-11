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
  IResourceReference,
  useResourceState,
  ResourceType,
  IResourceFetcher,
  IResourceState,
  resourcesReducer,
  ResourceManagerProvider,
} from './resource-kit'
import { Provider, useSelector } from 'react-redux'
import logger from 'redux-logger'

type ProjectList = { projectIds: string[] }
const projectListResources = new ResourceType<ProjectList>('ProjectList')

type Project = { _id: string; title: string }
const projectResources = new ResourceType<Project>('Project')

async function fetchAllProjects() {
  await new Promise(r => setTimeout(r, 500))
  return [
    { _id: 'a', title: 'Project A' },
    { _id: 'b', title: 'Project B' },
    { _id: 'c', title: 'Project C' },
  ]
}

const projectListFetcher: IResourceFetcher<ProjectList> = request => {
  request.beginLoadTransaction([request.reference], async tx => {
    const projects = await fetchAllProjects()
    tx.receive(request.reference, { projectIds: projects.map(p => p._id) })
    for (const p of projects) {
      tx.receive(projectResources.ref(p._id), p)
    }
  })
}

function useProjectList() {
  const state = useResourceState(
    projectListResources.ref('*'),
    projectListFetcher,
  )
  return state
}

function useProject(projectId: string) {
  const state = useResourceState(projectResources.ref(projectId), () => {})
  return state
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
    <ResourceManagerProvider
      config={{
        selectState: state => state.resources,
      }}
    >
      <App />
    </ResourceManagerProvider>
  </Provider>,
  rootElement,
)
