export interface IResourceState<T> {
  loading: boolean
  outdated: boolean
  error?: Error
  data?: T
}

export interface IResourceStateWithReference<T> extends IResourceState<T> {
  reference: IResourceReference<T>
}

export interface IResourceType<T> {
  typeName: string
  ref(key: string): IResourceReference<T>
  options: ResourceOptions<T>
}

export type ResourceOptions<T> = {
  load?: (keys: string[], tx: LoadTransaction) => PromiseLike<T[]>
  batch?: boolean
  maxBatchSize?: number
}

export interface IResourceReference<T> {
  type: IResourceType<T>
  key: string
}

export type ResourceFetchResult =
  | { status: 'completed'; data: any }
  | { status: 'error'; error: Error }

export type ResourceFetchResultEntry = {
  reference: IResourceReference<any>
  result: ResourceFetchResult
}

export type LoadTransaction = {
  receive<T>(reference: IResourceReference<T>, data: T): void
  error<T>(reference: IResourceReference<T>, error: Error): void
}

export type LoadTransactionHandler = (
  referencesToLoad: IResourceReference<any>[],
  transaction: LoadTransaction,
) => PromiseLike<void>

export interface IResourceFetchRequest<T> {
  reference: IResourceReference<T>
  beginLoadTransaction(
    references: IResourceReference<any>[],
    transactionHandler: LoadTransactionHandler,
  ): PromiseLike<void>
}
