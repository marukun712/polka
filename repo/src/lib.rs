mod repository;
mod wrapper;

use crate::repository::exports::polka::repository::repo::{self, GetResult};
use atrium_api::types::string::{Did, RecordKey};
use cid::Cid;
use hex::{decode, encode};
use std::{cell::RefCell, str::FromStr};

struct Repo {
    repo: RefCell<Option<atrium_repo::Repository<wrapper::BlockstoreWrapper>>>,
    builder: RefCell<Option<atrium_repo::repo::RepoBuilder<wrapper::BlockstoreWrapper>>>,
}

impl repo::GuestRepo for Repo {
    fn new(&self, did: String, bs: &repo::Blockstore) -> Result<String, String> {
        let did = match Did::new(did) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let store = wrapper::BlockstoreWrapper::new(bs);
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let builder_res = rt.block_on(async { atrium_repo::Repository::create(store, did).await });
        let builder = match builder_res {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        *self.builder.borrow_mut() = Some(builder);
        match self.builder.borrow().as_ref() {
            Some(b) => Ok(encode(b.bytes())),
            None => Err("Failed to store builder".into()),
        }
    }

    fn finalize(&self, sig: String) -> Result<bool, String> {
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let builder_opt = self.builder.borrow_mut().take();
        let builder = match builder_opt {
            Some(b) => b,
            None => return Err("RepoBuilder not initialized. Call new() first.".into()),
        };
        let repo_res = rt.block_on(async { builder.finalize(sig_bytes).await });
        let repo = match repo_res {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    fn open(&self, bs: &repo::Blockstore, cid: String) -> Result<bool, String> {
        let cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let store = wrapper::BlockstoreWrapper::new(bs);
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let repo_res = rt.block_on(async { atrium_repo::Repository::open(store, cid).await });
        let repo = match repo_res {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    fn create_record(&self, nsid: String, data: String) -> Result<String, String> {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let repo_opt = self.repo.borrow_mut().take();
        let mut repo = match repo_opt {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record_res = rt.block_on(async { repo.add_raw(&nsid, data).await });
        let record = match record_res {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.0.bytes()))
    }

    fn update_record(&self, rpath: String, data: String) -> Result<String, String> {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let repo_opt = self.repo.borrow_mut().take();
        let mut repo = match repo_opt {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record_res = rt.block_on(async { repo.update_raw(&rpath, data).await });
        let record = match record_res {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.0.bytes()))
    }

    fn delete_record(&self, rpath: String) -> Result<String, String> {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let repo_opt = self.repo.borrow_mut().take();
        let mut repo = match repo_opt {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record_res = rt.block_on(async { repo.delete_raw(&rpath).await });
        let record = match record_res {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.bytes()))
    }

    fn get_record(&self, rpath: String) -> Result<repo::GetResult, String> {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => return Err(format!("Failed to create tokio runtime: {}", e)),
        };
        let repo_opt = self.repo.borrow_mut().take();
        let mut repo = match repo_opt {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let rkey = match RecordKey::from_str(&rpath) {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        let record_res = rt.block_on(async { repo.get(rkey).await });
        let record = match record_res {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(GetResult {
            data: encode(record.unwrap().bytes()),
            cid: record.unwrap().cid().to_string(),
        })
    }

    fn commit(&self, sig: String) -> Result<bool, String> {
        let repo_opt = self.repo.borrow_mut().take();
        let mut repo = match repo_opt {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let commit = repo.commit();
    }
}
