mod repository;
use atrium_api::types::string::Did;
use atrium_repo::{Repository, blockstore::MemoryBlockStore};
use repository::exports::polka::repository::{crud, repo};
use std::cell::RefCell;

struct Repo {
    repository: RefCell<Repository<&'static mut MemoryBlockStore>>,
    did: Did,
}

impl repo::GuestRepo for Repo {
    fn new(&self, did: String, _bs: &repo::Blockstore) -> Result<repo::Repo, String> {
        let _ = self;
        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let blockstore: &mut MemoryBlockStore = Box::leak(Box::new(MemoryBlockStore::new()));

            let did: Did = Did::new(did).map_err(|e: &'static str| format!("{}", e))?;

            let builder: atrium_repo::repo::RepoBuilder<&mut MemoryBlockStore> =
                Repository::create(blockstore, did.clone())
                    .await
                    .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;

            let repository: Repository<&mut MemoryBlockStore> = builder
                .finalize(vec![])
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;

            Ok(repo::Repo::new(Repo {
                repository: RefCell::new(repository),
                did,
            }))
        })
    }

    fn open(&self, did: String, _bs: &repo::Blockstore, cid: String) -> Result<repo::Repo, String> {
        let _ = self;
        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let blockstore: &mut MemoryBlockStore = Box::leak(Box::new(MemoryBlockStore::new()));

            let parsed_did: Did = Did::new(did).map_err(|e| format!("{}", e))?;

            let cid = cid.parse().map_err(|e| format!("{:?}", e))?;

            let repository: Repository<&mut MemoryBlockStore> = Repository::open(blockstore, cid)
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;

            Ok(repo::Repo::new(Repo {
                repository: RefCell::new(repository),
                did: parsed_did,
            }))
        })
    }
}

struct Component;

impl repo::Guest for Component {
    type Repo = Repo;
}

impl crud::Guest for Component {
    fn create_record(
        repo: repo::RepoBorrow<'_>,
        nsid: String,
        data: String,
    ) -> Result<crud::CreateResult, String> {
        let repo_impl: &Repo = repo.get::<Repo>();
        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut repo_mut: std::cell::RefMut<'_, Repository<&'static mut MemoryBlockStore>> =
                repo_impl.repository.borrow_mut();

            let record_data: serde_json::Value =
                serde_json::from_str(&data).map_err(|e: serde_json::Error| format!("{}", e))?;

            let (_, record_cid) = repo_mut
                .add_raw(&nsid, record_data)
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;

            let tid: String = nsid.split('/').last().unwrap_or("").to_string();

            Ok(crud::CreateResult {
                cid: record_cid.to_string(),
                tid,
            })
        })
    }

    fn get_record(repo: repo::RepoBorrow<'_>, rpath: String) -> Result<crud::GetResult, String> {
        let repo_impl: &Repo = repo.get::<Repo>();

        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut repo_ref: std::cell::RefMut<'_, Repository<&'static mut MemoryBlockStore>> =
                repo_impl.repository.borrow_mut();
            let record: serde_json::Value = repo_ref
                .get_raw(&rpath)
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?
                .ok_or_else(|| "Record not found".to_string())?;
            Ok(crud::GetResult {
                cid: "".to_string(),
                data: serde_json::to_string(&record).map_err(|e| format!("{}", e))?,
            })
        })
    }

    fn update_record(
        repo: repo::RepoBorrow<'_>,
        rpath: String,
        data: String,
    ) -> Result<bool, String> {
        let repo_impl: &Repo = repo.get::<Repo>();

        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut repo_mut: std::cell::RefMut<'_, Repository<&'static mut MemoryBlockStore>> =
                repo_impl.repository.borrow_mut();
            let record_data: serde_json::Value =
                serde_json::from_str(&data).map_err(|e| format!("{}", e))?;
            let _ = repo_mut
                .add_raw(&rpath, record_data)
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;
            Ok(true)
        })
    }

    fn delete_record(repo: repo::RepoBorrow<'_>, rpath: String) -> Result<bool, String> {
        let repo_impl = repo.get::<Repo>();

        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut repo_mut: std::cell::RefMut<'_, Repository<&'static mut MemoryBlockStore>> =
                repo_impl.repository.borrow_mut();
            let _ = repo_mut
                .delete_raw(&rpath)
                .await
                .map_err(|e: atrium_repo::repo::Error| format!("{}", e))?;
            Ok(true)
        })
    }

    fn get_unsigned(repo: repo::RepoBorrow<'_>) -> Result<crud::Unsigned, String> {
        let repo_impl = repo.get::<Repo>();

        let repo_ref: std::cell::Ref<'_, Repository<&mut MemoryBlockStore>> =
            repo_impl.repository.borrow();

        Ok(crud::Unsigned {
            did: repo_impl.did.to_string(),
            version: 3,
            data: "".to_string(),
            rev: repo_ref.root().to_string(),
        })
    }

    fn commit(
        repo: repo::RepoBorrow<'_>,
        _commit: crud::Unsigned,
        sig: String,
    ) -> Result<bool, String> {
        let repo_impl = repo.get::<Repo>();

        let rt: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let signature = sig.as_bytes().to_vec();
            let repo_ref = repo_impl.repository.borrow();
            let _ = repo_ref.root();
            Ok(true)
        })
    }
}
