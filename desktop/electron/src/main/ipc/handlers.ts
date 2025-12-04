import { ipcMain } from 'electron'
import { repoManager } from '../services/repo'

export function registerRepoHandlers(): void {
  // リポジトリ初期化
  ipcMain.handle('repo:init', async (_, { sk, did }: { sk: string; did: string }) => {
    await repoManager.init(sk, did)
    return { success: true }
  })

  // CID取得
  ipcMain.handle('repo:getCid', async (_, { rpath }: { rpath: string }) => {
    const repo = repoManager.getRepo()
    return repo.getCid(rpath)
  })

  // レコード取得
  ipcMain.handle('repo:getRecord', async (_, { rpath }: { rpath: string }) => {
    const repo = repoManager.getRepo()
    return repo.getRecord(rpath)
  })

  // レコード一覧取得(NSID指定)
  ipcMain.handle('repo:getRecords', async (_, { nsid }: { nsid: string }) => {
    const repo = repoManager.getRepo()
    return repo.getRecords(nsid)
  })

  // 全レコード取得
  ipcMain.handle('repo:allRecords', async () => {
    const repo = repoManager.getRepo()
    return repo.allRecords()
  })

  // ルートCID取得
  ipcMain.handle('repo:getRoot', async () => {
    const repo = repoManager.getRepo()
    return repo.getRoot()
  })

  // レコード作成
  ipcMain.handle('repo:create', async (_, { rpath, data }: { rpath: string; data: string }) => {
    const repo = repoManager.getRepo()
    return repo.create(rpath, data)
  })

  // レコード更新
  ipcMain.handle('repo:update', async (_, { rpath, data }: { rpath: string; data: string }) => {
    const repo = repoManager.getRepo()
    return repo.update(rpath, data)
  })

  // レコード削除
  ipcMain.handle('repo:delete', async (_, { rpath }: { rpath: string }) => {
    const repo = repoManager.getRepo()
    return repo.delete(rpath)
  })
}
