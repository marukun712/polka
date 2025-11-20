package blockstore

import (
	"context"
	"fmt"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/marukun712/polka/repo/internal/polka/repository/blockstore"
	"go.bytecodealliance.org/cm"
)

type WitBlockstore struct {
	handle blockstore.Blockstore
}

func NewWitBlockstore(handle blockstore.Blockstore) *WitBlockstore {
	return &WitBlockstore{handle: handle}
}

func (w *WitBlockstore) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	result := w.handle.Get(c.String())
	if result.IsErr() {
		return nil, fmt.Errorf("blockstore get failed: %s", *result.Err())
	}
	cmList := result.OK()
	data := cmList.Slice()
	return blocks.NewBlockWithCid(data, c)
}

func (w *WitBlockstore) Put(ctx context.Context, block blocks.Block) error {
	rawData := block.RawData()
	cmList := cm.ToList(rawData)
	result := w.handle.Put(cmList)
	if result.IsErr() {
		return fmt.Errorf("blockstore put failed: %s", *result.Err())
	}
	return nil
}
