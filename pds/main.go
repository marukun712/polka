package main

import (
	"context"
	"log"

	blockstore "github.com/ipfs/boxo/blockstore"
	leveldb "github.com/ipfs/go-ds-leveldb"
	"github.com/marukun712/polka/pds/repo"
)

func main() {
	ctx := context.Background()
	dir := "./store"
	ds, err := leveldb.NewDatastore(dir, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	bs := blockstore.NewBlockstore(ds)
	r := repo.NewRepo(ctx, bs)
}
