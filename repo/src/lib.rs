mod repository;
use atrium_api::types::string::Did;
use atrium_repo::{Repository, blockstore::MemoryBlockStore};
use repository::exports::polka::repository::crud
struct Component;

impl crud::Guest for Component {
    fn commit(repo: &crud::Repo,commit: crud::Unsigned,sig: _rt::String,) -> Result<bool,_rt::String> {
    }

    fn create_record(repo: &crud::Repo,nsid: _rt::String,data: _rt::String,) -> Result<crud::CreateResult,_rt::String> {
        
    }

    fn delete_record(repo: &crud::Repo,rpath: _rt::String,) -> Result<bool,_rt::String> {
        
    }

    fn get_record(repo: &crud::Repo,rpath: _rt::String,) -> Result<crud::GetResult,_rt::String> {
        
    }

    fn get_unsigned(repo: &crud::Repo,) -> Result<crud::Unsigned,_rt::String> {
        
    }

    fn update_record(repo: &crud::Repo,rpath: _rt::String,data: _rt::String,) -> Result<bool,_rt::String> {
        
    }
}

pub async fn example_usage() -> Result<(), Box<dyn std::error::Error>> {
    let mut blockstore = MemoryBlockStore::new();

    let did: Did =
        Did::new("did:key:z6MkjdNKFJjaMTE6JQcFpHN4bLSH5iQzVHF752QSneqbZNMa".to_string())?;
    let builder = Repository::create(&mut blockstore, did).await?;

    let mock_signature = vec![0u8; 64];
    let mut repo = builder.finalize(mock_signature).await?;

    println!("リポジトリを作成しました。Root CID: {}", repo.root());

    let record_key = "app.bsky.feed.post/example123";
    let record_data = serde_json::json!({
        "text": "Hello, ATProto!",
    });

    let (commit_builder, record_cid) = repo.add_raw(record_key, record_data).await?;

    println!("レコードを追加しました。CID: {}", record_cid);

    let mock_signature = vec![0u8; 64];
    let new_root_cid = commit_builder.finalize(mock_signature).await?;

    println!("コミットを確定しました。新しいRoot CID: {}", new_root_cid);

    let retrieved: serde_json::Value = repo
        .get_raw(record_key)
        .await?
        .expect("レコードが見つかりません");

    println!(
        "レコードを取得しました: {}",
        serde_json::to_string_pretty(&retrieved)?
    );

    Ok(())
}
