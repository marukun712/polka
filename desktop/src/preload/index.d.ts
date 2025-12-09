import { ElectronAPI } from '@electron-toolkit/preload'

interface IpcResult {
  success: boolean
  data?: unknown
  error?: string
}

interface RepoApi {
  init(didKey: string): Promise<IpcResult>
  create(rpath: string, data: string): Promise<IpcResult>
  update(rpath: string, data: string): Promise<IpcResult>
  delete(rpath: string): Promise<IpcResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      repo: RepoApi
    }
  }
}
