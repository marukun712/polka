mod repository;
mod wrapper;

use crate::repository::exports::polka::repository::repo::{self};
use atrium_api::types::string::Did;
use cid::Cid;
use hex::{decode, encode};
use std::{cell::RefCell, str::FromStr};

struct Repo {
    repo: RefCell<Option<atrium_repo::Repository<wrapper::BlockstoreWrapper>>>,
    builder: RefCell<Option<atrium_repo::repo::RepoBuilder<wrapper::BlockstoreWrapper>>>,
    rt: RefCell<Option<tokio::runtime::Runtime>>,
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
        *self.rt.borrow_mut() = Some(rt);
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let builder = rt.block_on(async { atrium_repo::Repository::create(store, did).await });
        let builder = match builder {
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
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let sig_bytes = match decode(sig) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let builder = self.builder.borrow_mut().take();
        let builder = match builder {
            Some(b) => b,
            None => return Err("RepoBuilder not initialized. Call new() first.".into()),
        };
        let repo = rt.block_on(async { builder.finalize(sig_bytes).await });
        let repo = match repo {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    fn open(&self, bs: &repo::Blockstore, cid: String) -> Result<bool, String> {
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let cid = match Cid::from_str(&cid) {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        let store = wrapper::BlockstoreWrapper::new(bs);
        let repo = rt.block_on(async { atrium_repo::Repository::open(store, cid).await });
        let repo = match repo {
            Ok(v) => v,
            Err(e) => return Err(e.to_string()),
        };
        *self.repo.borrow_mut() = Some(repo);
        Ok(true)
    }

    fn create_record(&self, nsid: String, data: String) -> Result<String, String> {
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let repo = self.repo.borrow_mut().take();
        let mut repo = match repo {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record = rt.block_on(async { repo.add_raw(&nsid, data).await });
        let record = match record {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.0.bytes()))
    }

    fn update_record(&self, rpath: String, data: String) -> Result<String, String> {
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let repo = self.repo.borrow_mut().take();
        let mut repo = match repo {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record = rt.block_on(async { repo.update_raw(&rpath, data).await });
        let record = match record {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.0.bytes()))
    }

    fn delete_record(&self, rpath: String) -> Result<String, String> {
        let rt = self.rt.borrow();
        let rt = match rt.as_ref() {
            Some(b) => b,
            None => return Err("Error creating tokio runtime".into()),
        };
        let repo = self.repo.borrow_mut().take();
        let mut repo = match repo {
            Some(r) => r,
            None => return Err("Repo not initialized. Call open() first.".into()),
        };
        let record = rt.block_on(async { repo.delete_raw(&rpath).await });
        let record = match record {
            Ok(r) => r,
            Err(e) => return Err(e.to_string()),
        };
        Ok(encode(record.bytes()))
    }
}
