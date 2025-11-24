mod repository;
use atrium_api::types::string::Did;
use atrium_repo::{Repository, blockstore::MemoryBlockStore};
use once_cell::sync::Lazy;
use repository::exports::polka::repository::{crud, repo};

static RUNTIME: Lazy<tokio::runtime::Runtime> =
    Lazy::new(|| tokio::runtime::Runtime::new().expect("Failed to create runtime"));

struct Repo;

impl repo::GuestRepo for Repo {
    fn new(&self, did: String, bs: &repo::Blockstore) -> Result<repo::Repo, String> {
        let _ = self;
        RUNTIME.block_on(async {
            let mut blockstore = MemoryBlockStore::new();

            let did = Did::new(did).map_err(|e| format!("{}", e))?;

            let builder = Repository::create(&mut blockstore, did)
                .await
                .map_err(|e| format!("{}", e))?;

            Ok(repo::Repo::new(builder))
        })
    }

    fn open(&self, did: String, bs: &repo::Blockstore, cid: String) -> Result<repo::Repo, String> {
        let _ = self;
        RUNTIME.block_on(async {
            let mut blockstore = MemoryBlockStore::new();
            let cid = cid.parse().map_err(|e| format!("{:?}", e))?;
            let repo_instance = Repository::open(&mut blockstore, cid)
                .await
                .map_err(|e| format!("{}", e))?;
            Ok(repo::Repo::new(repo_instance))
        })
    }
}

struct Component;

impl repo::Guest for Component {
    type Repo = Repo;
}

impl crud::Guest for Component {
    fn create_record(
        repo: &crud::Repo,
        nsid: String,
        data: String,
    ) -> Result<crud::CreateResult, String> {
        let repo_impl = repo.get::<Repo>();
        RUNTIME.block_on(async {
            let mut repo_mut = repo_impl.borrow_mut();
            let record_data: serde_json::Value =
                serde_json::from_str(&data).map_err(|e| format!("{}", e))?;
            let (_, record_cid) = repo_mut
                .add_raw(&nsid, record_data)
                .await
                .map_err(|e| format!("{}", e))?;
            let tid = nsid.split('/').last().unwrap_or("").to_string();
            Ok(crud::CreateResult {
                cid: record_cid.to_string(),
                tid,
            })
        })
    }

    fn get_record(repo: &crud::Repo, rpath: String) -> Result<crud::GetResult, String> {
        let repo_impl = repo.get::<Repo>();
        RUNTIME.block_on(async {
            let repo_ref = repo_impl.borrow();
            let record: serde_json::Value = repo_ref
                .get_raw(&rpath)
                .await
                .map_err(|e| format!("{}", e))?
                .ok_or_else(|| "Record not found".to_string())?;
            Ok(crud::GetResult {
                cid: "".to_string(),
                data: serde_json::to_string(&record).map_err(|e| format!("{}", e))?,
            })
        })
    }

    fn update_record(repo: &crud::Repo, rpath: String, data: String) -> Result<bool, String> {
        let repo_impl = repo.get::<Repo>();
        RUNTIME.block_on(async {
            let mut repo_mut = repo_impl.borrow_mut();
            let record_data: serde_json::Value =
                serde_json::from_str(&data).map_err(|e| format!("{}", e))?;
            let _ = repo_mut
                .add_raw(&rpath, record_data)
                .await
                .map_err(|e| format!("{}", e))?;
            Ok(true)
        })
    }

    fn delete_record(repo: &crud::Repo, rpath: String) -> Result<bool, String> {
        let repo_impl = repo.get::<Repo>();
        RUNTIME.block_on(async {
            let mut repo_mut = repo_impl.borrow_mut();
            let _ = repo_mut
                .delete(&rpath)
                .await
                .map_err(|e| format!("{}", e))?;
            Ok(true)
        })
    }

    fn get_unsigned(repo: &crud::Repo) -> Result<crud::Unsigned, String> {
        let repo_impl = repo.get::<Repo>();
        let repo_ref = repo_impl.borrow();
        Ok(crud::Unsigned {
            did: repo_ref.did().to_string(),
            version: 3,
            data: "".to_string(),
            rev: repo_ref.root().to_string(),
        })
    }

    fn commit(repo: &crud::Repo, _commit: crud::Unsigned, sig: String) -> Result<bool, String> {
        let repo_impl = repo.get::<Repo>();
        RUNTIME.block_on(async {
            let signature = sig.as_bytes().to_vec();
            let repo_ref = repo_impl.borrow();
            let _ = repo_ref.root();
            Ok(true)
        })
    }
}
