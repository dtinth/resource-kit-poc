import React from 'react'
import ReactDOM from 'react-dom'
import './styles.css'
import { createStore, combineReducers } from 'redux'
import { createResourceManager } from './resource-kit'
import { Provider } from 'react-redux'

function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
    </div>
  )
}

const resourceKit = createResourceManager({
  selector: state => state.resources,
})
const reducer = combineReducers({
  resources: resourceKit.reducer,
})

const store = createStore(reducer)
const rootElement = document.getElementById('root')
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement,
)
