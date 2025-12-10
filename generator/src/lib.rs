mod repository;
mod wasip2_store;

use crate::repository::exports::polka::repository::repo::{GuestRepo, Repo};
use crate::repository::polka::repository::crypto;
use atrium_api::types::string::Did;
use atrium_crypto::{did::parse_did_key, verify::Verifier};
use cid::Cid;
use futures::TryStreamExt;
use futures::executor::block_on;
use repository::exports::polka::repository::repo;
use std::{cell::RefCell, str::FromStr};
use wasip2_store::Wasip2Blockstore;

struct HostRepo {
    repo: atrium_repo::Repository<Wasip2Blockstore>,
    did: String,
}

impl HostRepo {
    fn create(&mut self, rpath: String, data: String) -> Result<String, String> {
        let (commit_builder, cid) =
            block_on(async { self.repo.add_raw(&rpath, data).await }).map_err(|e| e.to_string())?;
        // このcrypto interfaceはホストが実装する
        let sig = crypto::sign(&commit_builder.bytes());
        // Commitを確定
        block_on(async { commit_builder.finalize(sig).await }).map_err(|e| e.to_string())?;
        // 検証
        let commit = self.repo.commit();
        match parse_did_key(&self.did) {
            Ok((alg, pub_key)) => {
                match Verifier::default().verify(alg, &pub_key, &commit.bytes(), &commit.sig()) {
                    Ok(_) => (),
                    Err(e) => return Err(e.to_string()),
                }
            }
            Err(e) => return Err(e.to_string()),
        }
        Ok(cid.to_string())
    }

    fn update(&mut self, rpath: String, data: String) -> Result<String, String> {
        let (commit_builder, cid) = block_on(async { self.repo.update_raw(&rpath, data).await })
            .map_err(|e| e.to_string())?;
        let sig = crypto::sign(&commit_builder.bytes());
        block_on(async { commit_builder.finalize(sig).await }).map_err(|e| e.to_string())?;
        let commit = self.repo.commit();
        match parse_did_key(&self.did) {
            Ok((alg, pub_key)) => {
                match Verifier::default().verify(alg, &pub_key, &commit.bytes(), &commit.sig()) {
                    Ok(_) => (),
                    Err(e) => return Err(e.to_string()),
                }
            }
            Err(e) => return Err(e.to_string()),
        }
        Ok(cid.to_string())
    }

    fn delete(&mut self, rpath: String) -> Result<bool, String> {
        let commit_builder =
            block_on(async { self.repo.delete_raw(&rpath).await }).map_err(|e| e.to_string())?;
        let sig = crypto::sign(&commit_builder.bytes());
        block_on(async { commit_builder.finalize(sig).await }).map_err(|e| e.to_string())?;
        let commit = self.repo.commit();
        match parse_did_key(&self.did) {
            Ok((alg, pub_key)) => {
                match Verifier::default().verify(alg, &pub_key, &commit.bytes(), &commit.sig()) {
                    Ok(_) => (),
                    Err(e) => return Err(e.to_string()),
                }
            }
            Err(e) => return Err(e.to_string()),
        }
        Ok(true)
    }

    fn get_cid(&mut self, rpath: String) -> Result<String, String> {
        let mut tree = self.repo.tree();
        let raw_cid = block_on(async { tree.get(&rpath).await });
        let cid = match raw_cid {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        Ok(cid.unwrap().to_string())
    }

    fn get_record(&mut self, rpath: String) -> Result<repo::GetResult, String> {
        let record: Option<String> =
            block_on(async { self.repo.get_raw(&rpath).await }).map_err(|e| e.to_string())?;
        let data = record.ok_or("Record not found")?;
        Ok(repo::GetResult { rpath, data })
    }

    fn get_records(&mut self, nsid: String) -> Result<Vec<repo::GetResult>, String> {
        let mut tree = self.repo.tree();
        let stream = block_on(async { tree.entries_prefixed(&nsid).try_collect().await });
        let keys: Vec<(String, Cid)> = match stream {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let records = keys
            .iter()
            .map(|k| self.get_record(k.0.clone()))
            .collect::<Result<_, _>>()?;
        Ok(records)
    }

    fn all_records(&mut self) -> Result<Vec<repo::GetResult>, String> {
        let mut tree = self.repo.tree();
        let stream = block_on(async { tree.entries().try_collect().await });
        let keys: Vec<(String, Cid)> = match stream {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let records = keys
            .iter()
            .map(|k| self.get_record(k.0.clone()))
            .collect::<Result<_, _>>()?;
        Ok(records)
    }

    fn get_root(&mut self) -> Result<String, String> {
        Ok(self.repo.root().to_string())
    }
}

struct GuestRepoImpl {
    inner: RefCell<HostRepo>,
}

impl GuestRepo for GuestRepoImpl {
    fn create(&self, rpath: String, data: String) -> Result<String, String> {
        self.inner.borrow_mut().create(rpath, data)
    }

    fn update(&self, rpath: String, data: String) -> Result<String, String> {
        self.inner.borrow_mut().update(rpath, data)
    }

    fn delete(&self, rpath: String) -> Result<bool, String> {
        self.inner.borrow_mut().delete(rpath)
    }

    fn get_cid(&self, rpath: String) -> Result<String, String> {
        self.inner.borrow_mut().get_cid(rpath)
    }

    fn get_record(&self, rpath: String) -> Result<repo::GetResult, String> {
        self.inner.borrow_mut().get_record(rpath)
    }

    fn get_records(&self, nsid: String) -> Result<Vec<repo::GetResult>, String> {
        self.inner.borrow_mut().get_records(nsid)
    }

    fn all_records(&self) -> Result<Vec<repo::GetResult>, String> {
        self.inner.borrow_mut().all_records()
    }

    fn get_root(&self) -> Result<String, String> {
        self.inner.borrow_mut().get_root()
    }
}

struct Component;

impl repository::exports::polka::repository::repo::Guest for Component {
    type Repo = GuestRepoImpl;

    fn create(did: String) -> Result<repo::Repo, String> {
        let did_clone = did.clone();
        let parsed = match Did::new(did_clone) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = Wasip2Blockstore::new();
        // CommitBuilderを取得
        let builder = block_on(async { atrium_repo::Repository::create(bs, parsed).await });
        let builder = match builder {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // このcrypto interfaceはホスト側が実装する
        let sig = crypto::sign(&builder.bytes());

        let repo = block_on(async { builder.finalize(sig).await });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let commit = repo.commit();
        match parse_did_key(&did) {
            Ok((alg, pub_key)) => {
                match Verifier::default().verify(alg, &pub_key, &commit.bytes(), &commit.sig()) {
                    Ok(_) => (),
                    Err(e) => return Err(e.to_string()),
                }
            }
            Err(e) => return Err(e.to_string()),
        }
        let guest_repo = GuestRepoImpl {
            inner: RefCell::new(HostRepo { repo, did }),
        };
        Ok(repo::Repo::new(guest_repo))
    }

    fn open(did: String, cid: String) -> Result<Repo, String> {
        let parsed_cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = wasip2_store::Wasip2Blockstore::new();
        // Repositoryを取得
        let repo = block_on(async { atrium_repo::Repository::open(bs, parsed_cid).await });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let commit = repo.commit();
        match parse_did_key(&did) {
            Ok((alg, pub_key)) => {
                match Verifier::default().verify(alg, &pub_key, &commit.bytes(), &commit.sig()) {
                    Ok(_) => (),
                    Err(e) => return Err(e.to_string()),
                }
            }
            Err(e) => return Err(e.to_string()),
        }
        let guest_repo = GuestRepoImpl {
            inner: RefCell::new(HostRepo { repo, did }),
        };
        Ok(repo::Repo::new(guest_repo))
    }
}

repository::export!(Component with_types_in repository);
