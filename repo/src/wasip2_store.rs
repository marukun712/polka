use crate::repository::polka::repository::blockstore;
use atrium_repo::blockstore::{AsyncBlockStoreRead, AsyncBlockStoreWrite, Error};
use ipld_core::cid::Cid;

pub struct Wasip2Blockstore;

impl Wasip2Blockstore {
    pub fn new() -> Self {
        Self {}
    }
}

impl AsyncBlockStoreRead for Wasip2Blockstore {
    async fn read_block_into(&mut self, cid: Cid, contents: &mut Vec<u8>) -> Result<(), Error> {
        let block = blockstore::read_block(&cid.to_bytes());
        contents.clear();
        contents.extend_from_slice(&block);
        Ok(())
    }
}

impl AsyncBlockStoreWrite for Wasip2Blockstore {
    async fn write_block(&mut self, codec: u64, hash: u64, contents: &[u8]) -> Result<Cid, Error> {
        let cid_bytes = blockstore::write_block(codec, hash, contents);
        let cid = Cid::try_from(cid_bytes.as_slice()).map_err(|_| Error::UnsupportedHash(hash))?;
        Ok(cid)
    }
}
