import { ElectronAPI } from '@electron-toolkit/preload'

interface GetResult {
  rpath: string
  data: string
}

interface RepoAPI {
  init: (sk: string, did: string) => Promise<{ success: boolean }>
  getCid: (rpath: string) => Promise<string>
  getRecord: (rpath: string) => Promise<GetResult>
  getRecords: (nsid: string) => Promise<GetResult[]>
  allRecords: () => Promise<GetResult[]>
  getRoot: () => Promise<string>
  create: (rpath: string, data: string) => Promise<string>
  update: (rpath: string, data: string) => Promise<string>
  delete: (rpath: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      repo: RepoAPI
    }
  }
}
