mod repository;
use std::{cell::RefCell, str::FromStr};

use crate::repository::exports::polka::repository::repo::{GuestBuilder, GuestRepo, Repo};
use atrium_api::types::string::Did;
use atrium_crypto::{did::parse_did_key, verify::Verifier};
use cid::Cid;
use hex::{decode, encode};
use repository::exports::polka::repository::repo;

struct HostRepo {
    repo: atrium_repo::Repository<atrium_repo::blockstore::MemoryBlockStore>,
    did: String,
}

struct HostBuilder {
    builder: atrium_repo::repo::RepoBuilder<atrium_repo::blockstore::MemoryBlockStore>,
    did: String,
}

impl HostBuilder {
    // builderをhexとして返す
    fn get_bytes(&mut self) -> String {
        encode(self.builder.bytes())
    }

    // builderを取得
    fn finalize(&mut self, sig: String) -> Result<HostRepo, String> {
        // sigをbytesとして取得
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };

        let repo = futures::executor::block_on(async { self.builder.finalize(sig_bytes).await })
            .map_err(|e: atrium_repo::repo::Error| e.to_string())?;

        Ok(HostRepo {
            repo,
            did: self.did,
        })
    }
}

impl HostRepo {
    // create操作をステージング(署名用bytesを取得)
    fn create_stage(&mut self, nsid: String, data: String) -> Result<String, String> {
        // add_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let (stage_builder, _) =
            futures::executor::block_on(async { self.repo.add_raw(&nsid, data).await })
                .map_err(|e| e.to_string())?;

        // hexにして返す
        Ok(encode(stage_builder.bytes()))
    }

    // update操作をステージング(署名用bytesを取得)
    fn update_stage(&mut self, rpath: String, data: String) -> Result<String, String> {
        // update_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let (stage_builder, _) =
            futures::executor::block_on(async { self.repo.update_raw(&rpath, data).await })
                .map_err(|e| e.to_string())?;

        Ok(encode(stage_builder.bytes()))
    }

    // delete操作をステージング(署名用bytesを取得)
    fn delete_stage(&mut self, rpath: String) -> Result<String, String> {
        // delete_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let stage_builder =
            futures::executor::block_on(async { self.repo.delete_raw(&rpath).await })
                .map_err(|e| e.to_string())?;

        Ok(encode(stage_builder.bytes()))
    }

    // create操作をコミット(確定)
    fn create_commit(&mut self, nsid: String, data: String, sig: String) -> Result<bool, String> {
        let (commit_builder, _) =
            futures::executor::block_on(async { self.repo.add_raw(&nsid, data).await })
                .map_err(|e| e.to_string())?;

        // 署名をデシリアライズ
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };

        // Commitを確定
        futures::executor::block_on(async { commit_builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;

        // 検証
        let commit = self.repo.commit();
        let (alg, pub_key) = parse_did_key(&self.did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();

        Ok(true)
    }

    fn update_commit(&mut self, rpath: String, data: String, sig: String) -> Result<bool, String> {
        let (commit_builder, _) =
            futures::executor::block_on(async { self.repo.update_raw(&rpath, data).await })
                .map_err(|e| e.to_string())?;

        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };

        futures::executor::block_on(async { commit_builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;

        let commit = self.repo.commit();
        let (alg, pub_key) = parse_did_key(&self.did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();

        Ok(true)
    }

    fn delete_commit(&mut self, rpath: String, sig: String) -> Result<bool, String> {
        let commit_builder =
            futures::executor::block_on(async { self.repo.delete_raw(&rpath).await })
                .map_err(|e| e.to_string())?;

        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };

        futures::executor::block_on(async { commit_builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;

        let commit = self.repo.commit();
        let (alg, pub_key) = parse_did_key(&self.did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();

        Ok(true)
    }

    fn get_record(&mut self, rpath: String) -> Result<repo::GetResult, String> {
        let record: Option<String> =
            futures::executor::block_on(async { self.repo.get_raw(&rpath).await })
                .map_err(|e| e.to_string())?;

        let data = record.ok_or("Record not found")?;
        Ok(repo::GetResult { data })
    }
}

struct GuestBuilderImpl {
    inner: RefCell<HostBuilder>,
}

impl GuestBuilder for GuestBuilderImpl {
    fn get_bytes(&self) -> String {
        self.inner.borrow_mut().get_bytes()
    }

    fn finalize(&self, sig: String) -> Result<Repo, String> {
        let mut host = self.inner.borrow_mut();
        let host_repo = host.finalize(sig)?;
        let guest_repo = GuestRepoImpl {
            inner: RefCell::new(host_repo),
        };
        Ok(Repo::new(guest_repo))
    }
}

struct GuestRepoImpl {
    inner: RefCell<HostRepo>,
}

impl GuestRepo for GuestRepoImpl {
    fn create_stage(&self, nsid: String, data: String) -> Result<String, String> {
        self.inner.borrow_mut().create_stage(nsid, data)
    }

    fn update_stage(&self, rpath: String, data: String) -> Result<String, String> {
        self.inner.borrow_mut().update_stage(rpath, data)
    }

    fn delete_stage(&self, rpath: String) -> Result<String, String> {
        self.inner.borrow_mut().delete_stage(rpath)
    }

    fn create_commit(&self, nsid: String, data: String, sig: String) -> Result<bool, String> {
        self.inner.borrow_mut().create_commit(nsid, data, sig)
    }

    fn update_commit(&self, rpath: String, data: String, sig: String) -> Result<bool, String> {
        self.inner.borrow_mut().update_commit(rpath, data, sig)
    }

    fn delete_commit(&self, rpath: String, sig: String) -> Result<bool, String> {
        self.inner.borrow_mut().delete_commit(rpath, sig)
    }

    fn get_record(&self, rpath: String) -> Result<repo::GetResult, String> {
        self.inner.borrow_mut().get_record(rpath)
    }
}

struct Component;

impl repository::exports::polka::repository::repo::Guest for Component {
    type Builder = GuestBuilderImpl;
    type Repo = GuestRepoImpl;

    fn create(did: String) -> Result<repo::Builder, String> {
        let parsed = match Did::new(did) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();
        // CommitBuilderを取得
        let builder = futures::executor::block_on(async {
            atrium_repo::Repository::create(bs, parsed).await
        });
        let builder = match builder {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // WITのBuilder Resourceとして返す
        let builder = GuestBuilderImpl {
            inner: RefCell::new(HostBuilder { builder, did }),
        };
        Ok(repo::Builder::new(builder))
    }

    fn open(did: String, cid: String) -> Result<Repo, String> {
        let parsed_cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();
        // Repositoryを取得
        let repo = futures::executor::block_on(async {
            atrium_repo::Repository::open(bs, parsed_cid).await
        });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let guest_repo = GuestRepoImpl {
            inner: RefCell::new(HostRepo { repo, did }),
        };
        Ok(repo::Repo::new(guest_repo))
    }
}

repository::export!(Component with_types_in repository);
