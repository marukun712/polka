package main

import (
	"context"
	"fmt"
	"log"

	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	leveldb "github.com/ipfs/go-ds-leveldb"
	"github.com/marukun712/polka/pds/repo"
)

func main() {
	did := "did:key:z6Mkqh5AD5V3GY6A8G7o7yD1Mjwp7RmpsRwidFTEsTPb5ow1"

	ctx := context.Background()
	dir := "./store"
	ds, err := leveldb.NewDatastore(dir, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	bs := blockstore.NewBlockstore(ds)

	r := repo.NewRepo(ctx, did, bs)
	post := map[string]interface{}{
		"content": "秘密鍵の無断使用は、罰金バッキンガムよ!",
	}
	recordCid, uuid, err := r.CreateRecord(ctx, "polka.post", post)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Created:", recordCid, uuid)

	r.ForEach(ctx, "polka.post", func(k string, v cid.Cid) error {
		fmt.Println(k, v)
		return nil
	})
}
