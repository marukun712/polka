mod repository;
use atrium_api::types::string::Did;
use atrium_crypto::{did::parse_did_key, verify::Verifier};
use cid::Cid;
use hex::{decode, encode};
use repository::exports::polka::repository::repo;
use std::{cell::RefCell, str::FromStr};

struct Repo {
    repo: RefCell<Option<atrium_repo::Repository<atrium_repo::blockstore::MemoryBlockStore>>>,
    did: RefCell<Option<String>>,
}

struct Builder {
    builder:
        RefCell<Option<atrium_repo::repo::RepoBuilder<atrium_repo::blockstore::MemoryBlockStore>>>,
}

impl repo::GuestBuilder for Builder {
    fn get_bytes(&self) -> String {
        // builderをhexとして返す
        let builder = self.builder.borrow();
        match builder.as_ref() {
            Some(b) => encode(b.bytes()),
            None => String::new(),
        }
    }

    fn finalize(&self, sig: String) -> Result<bool, String> {
        // builderを取得
        let builder = self.builder.borrow_mut().take();
        let builder = match builder {
            Some(b) => b,
            None => return Err("Commit already finalized or not initialized".to_string()),
        };
        // sigをbytesとして取得
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        futures::executor::block_on(async { builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;
        Ok(true)
    }
}

impl repo::GuestRepo for Repo {
    // リポジトリを新規作成
    fn new(&self, did: String) -> Result<repo::Builder, String> {
        *self.did.borrow_mut() = Some(did);
        let mut did = self.did.borrow_mut();
        let did = match did.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        // didをDidとして取得
        let did = match Did::new(did.to_string()) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();

        // CommitBuilderを取得
        let builder =
            futures::executor::block_on(async { atrium_repo::Repository::create(bs, did).await });
        let builder = match builder {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // WITのBuilder Resourceとして返す
        let builder = Builder {
            builder: RefCell::new(Some(builder)),
        };
        Ok(repo::Builder::new(builder))
    }

    // Root CIDがわかっている場合は開く
    fn open(&self, cid: String) -> Result<bool, String> {
        // cidをCidとして取得
        let cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // blockstoreを生成
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();
        // Repositoryを取得
        let repo =
            futures::executor::block_on(async { atrium_repo::Repository::open(bs, cid).await });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };

        // インスタンスにSet
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    // create操作をステージング(署名用bytesを取得)
    fn create_stage(&self, nsid: String, data: String) -> Result<String, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        // add_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let (builder, _) = futures::executor::block_on(async { repo.add_raw(&nsid, data).await })
            .map_err(|e| e.to_string())?;
        // hexにして返す
        Ok(encode(builder.bytes()))
    }

    // update操作をステージング(署名用bytesを取得)
    fn update_stage(&self, rpath: String, data: String) -> Result<String, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        // update_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let (builder, _) =
            futures::executor::block_on(async { repo.update_raw(&rpath, data).await })
                .map_err(|e| e.to_string())?;
        // hexにして返す
        Ok(encode(builder.bytes()))
    }

    // delete操作をステージング(署名用bytesを取得)
    fn delete_stage(&self, rpath: String) -> Result<String, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        // delete_rawを呼び出し、署名用bytesを取得(Commit確定はしない)
        let builder = futures::executor::block_on(async { repo.delete_raw(&rpath).await })
            .map_err(|e| e.to_string())?;
        // hexにして返す
        Ok(encode(builder.bytes()))
    }

    // create操作をコミット(確定)
    fn create_commit(&self, nsid: String, data: String, sig: String) -> Result<bool, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let (builder, _) = futures::executor::block_on(async { repo.add_raw(&nsid, data).await })
            .map_err(|e| e.to_string())?;
        // 署名をデシリアライズ
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // Commitを確定
        futures::executor::block_on(async { builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;
        //didを取得
        let mut did = self.did.borrow_mut();
        let did = match did.as_mut() {
            Some(r) => r,
            None => {
                return Err("Did not initialized.".to_string());
            }
        };
        // 検証
        let commit = repo.commit();
        let (alg, pub_key) = parse_did_key(&did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();
        Ok(true)
    }

    fn update_commit(&self, rpath: String, data: String, sig: String) -> Result<bool, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let (builder, _) =
            futures::executor::block_on(async { repo.update_raw(&rpath, data).await })
                .map_err(|e| e.to_string())?;
        // 署名をデシリアライズ
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // Commitを確定
        futures::executor::block_on(async { builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;
        //didを取得
        let mut did = self.did.borrow_mut();
        let did = match did.as_mut() {
            Some(r) => r,
            None => {
                return Err("Did not initialized.".to_string());
            }
        };
        // 検証
        let commit = repo.commit();
        let (alg, pub_key) = parse_did_key(&did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();
        Ok(true)
    }

    fn delete_commit(&self, rpath: String, sig: String) -> Result<bool, String> {
        // repoを取得
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let builder = futures::executor::block_on(async { repo.delete_raw(&rpath).await })
            .map_err(|e| e.to_string())?;
        // 署名をデシリアライズ
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        // Commitを確定
        futures::executor::block_on(async { builder.finalize(sig_bytes).await })
            .map_err(|e| e.to_string())?;
        //didを取得
        let mut did = self.did.borrow_mut();
        let did = match did.as_mut() {
            Some(r) => r,
            None => {
                return Err("Did not initialized.".to_string());
            }
        };
        // 検証
        let commit = repo.commit();
        let (alg, pub_key) = parse_did_key(&did).unwrap();
        Verifier::default()
            .verify(alg, &pub_key, &commit.bytes(), commit.sig())
            .unwrap();
        Ok(true)
    }

    fn get_record(&self, rpath: String) -> Result<repo::GetResult, String> {
        let mut repo = self.repo.borrow_mut();
        let repo = repo
            .as_mut()
            .ok_or("Repo not initialized. Call open() or finalize() first.".to_string())?;
        let record: Option<String> =
            futures::executor::block_on(async { repo.get_raw(&rpath).await })
                .map_err(|e| e.to_string())?;
        let data = record.ok_or("Record not found")?;
        Ok(repo::GetResult { data })
    }
}

impl repository::exports::polka::repository::repo::Guest for Repo {
    type Builder = Builder;
    type Repo = Repo;

    fn create_repo() -> repo::Repo {
        repo::Repo::new(Repo {
            repo: RefCell::new(None),
            did: RefCell::new(None),
        })
    }
}

repository::export!(Repo);
