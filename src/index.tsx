import React, { ReactNode, Fragment } from 'react'
import ReactDOM from 'react-dom'
import './styles.css'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import {
  useResourceState,
  ResourceType,
  resourcesReducer,
  ResourceManagerProvider,
  IResourceStateWithReference,
} from './resource-kit'
import { Provider } from 'react-redux'
import logger from 'redux-logger'
import invariant from 'invariant'

// ============================================= Types
type ProjectList = { projectIds: string[] }
type Project = { _id: string; title: string }
type ProjectTasks = { taskIds: string[] }
type Task = { _id: string; alt_id: string; title: string; related: string[] }

// ============================================= Mock API

async function fetchAllProjects() {
  await new Promise(r => setTimeout(r, 500))
  return [
    { _id: 'a', title: 'Project A' },
    { _id: 'b', title: 'Project B' },
    { _id: 'c', title: 'Project C' },
  ]
}

const allTasks = {
  t1: {
    _id: 't1',
    alt_id: '1',
    title: 'Hello world 1',
    related: ['7', '8', '9'],
  },
  t2: { _id: 't2', alt_id: '2', title: 'Hello world 2', related: ['6', '8'] },
  t3: { _id: 't3', alt_id: '3', title: 'Hello world 3', related: ['7', '8'] },
  t4: { _id: 't4', alt_id: '4', title: 'Hello world 4', related: ['7', '8'] },
  t5: { _id: 't5', alt_id: '5', title: 'Hello world 5', related: ['7', '8'] },
  t6: { _id: 't6', alt_id: '6', title: 'Hello world 6', related: ['7', '8'] },
  t7: { _id: 't7', alt_id: '7', title: 'Hello world 7', related: ['7', '8'] },
  t8: { _id: 't8', alt_id: '8', title: 'Hello world 8', related: ['7', '8'] },
  t9: { _id: 't9', alt_id: '9', title: 'Hello world 9', related: ['7', '8'] },
} as any

const tasksByProjects = {
  a: ['t1', 't2', 't3'],
  b: ['t3', 't4', 't5', 't6'],
  c: ['t1', 't5', 't7', 't8', 't9'],
} as any

async function fetchTasksByProject(projectId: string): Promise<Task[]> {
  await new Promise(r => setTimeout(r, 500))
  return tasksByProjects[projectId].map((t: string) => allTasks[t])
}
async function fetchTaskById(taskId: string): Promise<Task> {
  await new Promise(r => setTimeout(r, 300 + 400 * Math.random()))
  return (
    allTasks[taskId] ||
    Object.values(allTasks).find((t: any) => t.alt_id === taskId)
  )
}

// ============================================= Resource types
const projectListResources = new ResourceType<ProjectList>('ProjectList', {
  async load(keys, tx) {
    const projects = await fetchAllProjects()
    for (const p of projects) {
      tx.receive(projectResources.ref(p._id), p)
    }
    return [{ projectIds: projects.map(p => p._id) }]
  },
})

const projectResources = new ResourceType<Project>('Project')

const projectTasksResources = new ResourceType<ProjectTasks>('ProjectTasks', {
  async load(keys, tx) {
    invariant(keys.length === 1, 'ProjectTasks does not support batching')
    const [key] = keys
    const tasks = await fetchTasksByProject(key)
    for (const t of tasks) {
      tx.receive(taskResources.ref(t._id), t)
    }
    return [{ taskIds: tasks.map(t => t._id) }]
  },
})

const taskResources = new ResourceType<Task>('Task', {
  async load(keys, tx) {
    invariant(keys.length === 1, 'Task does not support batching')
    const [key] = keys
    const task = await fetchTaskById(key)
    return [task]
  },
})

// ============================================= Fetcher and hooks
function useProjectList() {
  const state = useResourceState(projectListResources.ref('*'))
  return state
}
function useProject(projectId: string) {
  const state = useResourceState(projectResources.ref(projectId))
  return state
}
function useTasksInProject(projectId: string) {
  const state = useResourceState(projectTasksResources.ref(projectId))
  return state
}
function useTask(taskId: string) {
  const state = useResourceState(taskResources.ref(taskId))
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
        <div className="w-1/2 bg-gray-500 p-4">
          Tasks in project
          <TaskList projectId={'a'} />
        </div>
        <div className="w-1/4 bg-gray-400 p-4">
          Task information
          <TaskView taskId={'t1'} />
        </div>
      </div>
    </div>
  )
}

function ProjectList() {
  const listState = useProjectList()
  return (
    <ResourceStateVisualizer state={listState}>
      {listState.data && (
        <ul className="bg-white p-2">
          {listState.data.projectIds.map(id => {
            return (
              <li key={id}>
                <button className="block w-full border border-white rounded hover:border-gray-200 bg-white text-blue-500 hover:bg-gray-200 py-2 px-4">
                  <ProjectStateConnector projectId={id}>
                    {ps => (
                      <ResourceStateVisualizer state={ps}>
                        {(ps.data && ps.data.title) || `Project ${id}`}
                      </ResourceStateVisualizer>
                    )}
                  </ProjectStateConnector>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </ResourceStateVisualizer>
  )
}

function TaskList(props: { projectId: string }) {
  const projectState = useProject(props.projectId)
  const tasksState = useTasksInProject(props.projectId)
  return (
    <ResourceStateVisualizer state={projectState}>
      <h1>
        {(projectState.data && projectState.data.title) ||
          `Project ${props.projectId}`}
      </h1>
      <ResourceStateVisualizer state={tasksState}>
        {tasksState.data && (
          <ul className="bg-white p-2">
            {tasksState.data.taskIds.map(id => {
              return (
                <li key={id}>
                  <button className="block w-full border border-white rounded hover:border-gray-200 bg-white text-blue-500 hover:bg-gray-200 py-2 px-4">
                    <TaskStateConnector taskId={id}>
                      {ts => (
                        <ResourceStateVisualizer state={ts}>
                          {(ts.data && ts.data.title) || `Task ${id}`}
                        </ResourceStateVisualizer>
                      )}
                    </TaskStateConnector>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ResourceStateVisualizer>
    </ResourceStateVisualizer>
  )
}

function TaskView(props: { taskId: string }) {
  const taskState = useTask(props.taskId)
  return (
    <ResourceStateVisualizer state={taskState}>
      <h1>
        {(taskState.data && taskState.data.title) || `Task ${props.taskId}`}
      </h1>
      <div>
        {taskState.data && (
          <ul className="bg-white p-2">
            {taskState.data.related.map(id => {
              return (
                <li key={id}>
                  <button className="block w-full border border-white rounded hover:border-gray-200 bg-white text-blue-500 hover:bg-gray-200 py-2 px-4">
                    <TaskStateConnector taskId={id}>
                      {ts => (
                        <ResourceStateVisualizer state={ts}>
                          {(ts.data && ts.data.title) || `Task ${id}`}
                        </ResourceStateVisualizer>
                      )}
                    </TaskStateConnector>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </ResourceStateVisualizer>
  )
}
function ProjectStateConnector(props: {
  projectId: string
  children: (state: IResourceStateWithReference<Project>) => ReactNode
}) {
  const state = useProject(props.projectId)
  return <Fragment>{props.children(state)}</Fragment>
}
function TaskStateConnector(props: {
  taskId: string
  children: (state: IResourceStateWithReference<Task>) => ReactNode
}) {
  const state = useTask(props.taskId)
  return <Fragment>{props.children(state)}</Fragment>
}

function ResourceStateVisualizer(props: {
  state: IResourceStateWithReference<any>
  children: ReactNode
}) {
  const state = props.state
  const bg = state.loading
    ? 'bg-blue-500'
    : state.error
    ? 'bg-red-500'
    : state.data
    ? 'bg-green-500'
    : 'bg-gray-600'
  return (
    <div className={`${bg} p-1 pt-0`}>
      <div className="text-white text-xs font-bold text-left">
        {state.reference.type.typeName}:{state.reference.key}
      </div>
      <div className={'p-1 bg-white'}>{props.children}</div>
    </div>
  )
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
