import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Repo API for renderer
const repoAPI = {
  init: (sk: string, did: string) => ipcRenderer.invoke('repo:init', { sk, did }),
  getCid: (rpath: string) => ipcRenderer.invoke('repo:getCid', { rpath }),
  getRecord: (rpath: string) => ipcRenderer.invoke('repo:getRecord', { rpath }),
  getRecords: (nsid: string) => ipcRenderer.invoke('repo:getRecords', { nsid }),
  allRecords: () => ipcRenderer.invoke('repo:allRecords'),
  getRoot: () => ipcRenderer.invoke('repo:getRoot'),
  create: (rpath: string, data: string) => ipcRenderer.invoke('repo:create', { rpath, data }),
  update: (rpath: string, data: string) => ipcRenderer.invoke('repo:update', { rpath, data }),
  delete: (rpath: string) => ipcRenderer.invoke('repo:delete', { rpath })
}

// Custom APIs for renderer
const api = {
  repo: repoAPI
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
