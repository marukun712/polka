package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"

	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	leveldb "github.com/ipfs/go-ds-leveldb"
	"github.com/marukun712/polka/pds/repo"
)

func main() {
	pk := ""

	ctx := context.Background()

	dir := "./store"
	ds, err := leveldb.NewDatastore(dir, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	bs := blockstore.NewBlockstore(ds)

	pkBytes, err := hex.DecodeString(pk)
	if err != nil {
		log.Fatal(err)
	}

	r := repo.NewRepo(ctx, pkBytes, bs)

	post := map[string]interface{}{
		"content": "秘密鍵の無断使用は、罰金バッキンガムよ!",
	}

	recordCid, uuid, err := r.CreateRecord(ctx, "polka.post", post)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Created:", recordCid, uuid)

	sk := ""

	skBytes, err := hex.DecodeString(sk)
	if err != nil {
		log.Fatal(err)
	}

	rootCid, err := r.GetCID(ctx)
	if err != nil {
		log.Fatal(err)
	}

	uc := repo.UnsignedCommit{
		Data: rootCid,
	}
	ucBytes, err := json.Marshal(uc)
	if err != nil {
		log.Fatal(err)
	}
	signature := ed25519.Sign(skBytes, ucBytes)
	c := repo.SignedCommit{
		Data: rootCid,
		Sig:  signature,
	}
	r.Commit(ctx, c)

	r.ForEach(ctx, "polka.post", func(k string, v cid.Cid) error {
		fmt.Println(k, v)
		return nil
	})
}
