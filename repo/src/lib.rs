mod bindings {
    wit_bindgen::generate!({
        path: "wit/repo.wit",
    });
    use super::Repo;
    export!(Repo);
}

use atrium_api::types::string::Did;
use bindings::exports::polka::repository::repo;
use bindings::exports::polka::repository::repo::Guest;
use cid::Cid;
use hex::{decode, encode};
use std::{cell::RefCell, str::FromStr};

struct Repo {
    repo: RefCell<Option<atrium_repo::Repository<atrium_repo::blockstore::MemoryBlockStore>>>,
}

struct Builder {
    builder:
        RefCell<Option<atrium_repo::repo::RepoBuilder<atrium_repo::blockstore::MemoryBlockStore>>>,
}

impl repo::GuestBuilder for Builder {
    fn get_bytes(&self) -> String {
        let builder = self.builder.borrow();
        match builder.as_ref() {
            Some(b) => encode(b.bytes()),
            None => String::new(),
        }
    }

    fn finalize(&self, sig: String) -> Result<bool, String> {
        let builder = self.builder.borrow_mut().take();
        let builder = match builder {
            Some(b) => b,
            None => return Err("Commit already finalized or not initialized".to_string()),
        };
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        futures::executor::block_on(async { builder.finalize(sig_bytes).await });
        Ok(true)
    }
}

impl repo::GuestRepo for Repo {
    fn new(&self, did: String) -> Result<repo::Builder, String> {
        let did = match Did::new(did) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();
        let builder =
            futures::executor::block_on(async { atrium_repo::Repository::create(bs, did).await });
        let builder = match builder {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let builder = Builder {
            builder: RefCell::new(Some(builder)),
        };
        Ok(repo::Builder::new(builder))
    }

    fn open(&self, cid: String) -> Result<bool, String> {
        let cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let bs = atrium_repo::blockstore::MemoryBlockStore::new();
        let repo =
            futures::executor::block_on(async { atrium_repo::Repository::open(bs, cid).await });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    fn create_stage(&self, nsid: String, data: String) -> Result<String, String> {
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let (builder, _) = futures::executor::block_on(async { repo.add_raw(&nsid, data).await })
            .map_err(|e| e.to_string())?;
        Ok(encode(builder.bytes()))
    }

    fn update_stage(&self, rpath: String, data: String) -> Result<String, String> {
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
        Ok(encode(builder.bytes()))
    }

    fn delete_stage(&self, rpath: String) -> Result<String, String> {
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let builder = futures::executor::block_on(async { repo.delete_raw(&rpath).await })
            .map_err(|e| e.to_string())?;
        Ok(encode(builder.bytes()))
    }

    fn create_commit(&self, nsid: String, data: String, sig: String) -> Result<bool, String> {
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let (builder, _) = futures::executor::block_on(async { repo.add_raw(&nsid, data).await })
            .map_err(|e| e.to_string())?;
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        futures::executor::block_on(async { builder.finalize(sig_bytes).await });
        Ok(true)
    }

    fn update_commit(&self, rpath: String, data: String, sig: String) -> Result<bool, String> {
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
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        futures::executor::block_on(async { builder.finalize(sig_bytes).await });
        Ok(true)
    }

    fn delete_commit(&self, rpath: String, sig: String) -> Result<bool, String> {
        let mut repo = self.repo.borrow_mut();
        let repo = match repo.as_mut() {
            Some(r) => r,
            None => {
                return Err("Repo not initialized. Call open() or finalize() first.".to_string());
            }
        };
        let builder = futures::executor::block_on(async { repo.delete_raw(&rpath).await })
            .map_err(|e| e.to_string())?;
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        futures::executor::block_on(async { builder.finalize(sig_bytes).await });
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
