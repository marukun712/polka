import { GetResult } from 'dist/transpiled/interfaces/polka-repository-repo'

export class Client {
  static async init(sk: string, did: string): Promise<Client> {
    await window.api.repo.init(sk, did)
    return new Client()
  }

  async getCid(rpath: string): Promise<string> {
    return await window.api.repo.getCid(rpath)
  }

  async getRecord(rpath: string): Promise<GetResult> {
    return await window.api.repo.getRecord(rpath)
  }

  async getRecords(nsid: string): Promise<GetResult[]> {
    return await window.api.repo.getRecords(nsid)
  }

  async allRecords(): Promise<GetResult[]> {
    return await window.api.repo.allRecords()
  }

  async getRoot(): Promise<string> {
    return await window.api.repo.getRoot()
  }

  async create(rpath: string, data: string): Promise<string> {
    return await window.api.repo.create(rpath, data)
  }

  async update(rpath: string, data: string): Promise<string> {
    return await window.api.repo.update(rpath, data)
  }

  async delete(rpath: string): Promise<boolean> {
    return await window.api.repo.delete(rpath)
  }
}
