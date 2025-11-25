mod repository;
mod wrapper;

use crate::repository::exports::polka::repository::crud;
use crate::repository::exports::polka::repository::repo;
use atrium_api::types::string::Did;
use cid::Cid;
use std::str::FromStr;

struct Repo(Option<atrium_repo::Repository<wrapper::BlockstoreWrapper>>);
struct RepoBuilder(atrium_repo::repo::RepoBuilder<wrapper::BlockstoreWrapper>);

impl repo::Guest for Crud {
    type Repo = Repo;
    type RepoBuilder = RepoBuilder;
}

impl repo::GuestRepoBuilder for RepoBuilder {
    fn new(did: String, bs: &repo::Blockstore) -> RepoBuilder {
        let did = Did::new(did).map_err(|e| e.to_string());
        let store = wrapper::BlockstoreWrapper::new(bs);
        let rt = tokio::runtime::Runtime::new().unwrap();
        let builder =
            rt.block_on(async { atrium_repo::Repository::create(store, did.unwrap()).await });
        RepoBuilder(builder.ok().unwrap())
    }

    fn get_unsigned_bytes(&self) -> String {
        hex::encode(self.0.bytes())
    }

    fn finalize(&self, sig: String) -> Result<repo::Repo, String> {
        let sig_bytes = hex::decode(sig).map_err(|e| format!("Invalid hex signature: {}", e))?;
        let rt = tokio::runtime::Runtime::new().unwrap();
        let repository = rt.block_on(async { self.0.clone().finalize(sig_bytes).await });
        Ok(repo::Repo::new(Repo(Some(repository.ok().unwrap()))))
    }
}

impl repo::GuestRepo for Repo {
    fn open(&self, did: String, bs: &repo::Blockstore, cid: String) -> Result<repo::Repo, String> {
        let _did = Did::new(did).map_err(|e| e.to_string())?;
        let cid = Cid::from_str(&cid).map_err(|e| e.to_string())?;
        let store = wrapper::BlockstoreWrapper::new(bs);
        let rt = tokio::runtime::Runtime::new().unwrap();
        let repository = rt.block_on(async { atrium_repo::Repository::open(store, cid).await });
        Ok(repo::Repo::new(Repo(Some(repository.ok().unwrap()))))
    }
}

struct Crud;

impl crud::Guest for Crud {
    fn create_record(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
        nsid: String,
        data: String,
    ) -> Result<repository::exports::polka::repository::crud::CreateResult, String> {
        todo!()
    }

    fn delete_record(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
        rpath: String,
    ) -> Result<bool, String> {
        todo!()
    }

    fn get_record(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
        rpath: String,
    ) -> Result<repository::exports::polka::repository::crud::GetResult, String> {
        todo!()
    }

    fn update_record(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
        rpath: String,
        data: String,
    ) -> Result<bool, String> {
        todo!()
    }

    fn get_unsigned(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
    ) -> Result<repository::exports::polka::repository::crud::Unsigned, String> {
        todo!()
    }

    fn commit(
        repo: repository::exports::polka::repository::crud::RepoBorrow<'_>,
        commit: repository::exports::polka::repository::crud::Unsigned,
        sig: String,
    ) -> Result<bool, String> {
        todo!()
    }
}

repository::export!(Crud with_types_in repository);
