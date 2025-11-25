use crate::repository::polka::repository::blockstore::Blockstore;
use atrium_repo::blockstore::{AsyncBlockStoreRead, AsyncBlockStoreWrite, Error};
use cid::Cid;
use std::mem::ManuallyDrop;
use std::str::FromStr;

#[derive(Clone)]
pub struct BlockstoreWrapper {
    handle: u32,
}

impl BlockstoreWrapper {
    pub fn new(bs: &Blockstore) -> Self {
        Self {
            handle: bs.handle(),
        }
    }

    fn get_inner(&self) -> ManuallyDrop<Blockstore> {
        unsafe { ManuallyDrop::new(Blockstore::from_handle(self.handle)) }
    }
}

impl AsyncBlockStoreRead for BlockstoreWrapper {
    async fn read_block_into(&mut self, cid: Cid, buf: &mut Vec<u8>) -> Result<(), Error> {
        let bs = self.get_inner();
        let cid_str = cid.to_string();
        let data = bs.get(&cid_str).map_err(|e| {
            Error::Other(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))
        })?;

        buf.clear();
        buf.extend_from_slice(&data);
        Ok(())
    }
}

impl AsyncBlockStoreWrite for BlockstoreWrapper {
    async fn write_block(&mut self, _codec: u64, _hash: u64, data: &[u8]) -> Result<Cid, Error> {
        let bs = self.get_inner();
        let cid_str = bs.put(data).map_err(|e| {
            Error::Other(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))
        })?;
        Cid::from_str(&cid_str).map_err(|e| {
            Error::Other(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                e,
            )))
        })
    }
}
