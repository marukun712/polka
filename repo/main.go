package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"syscall/js"

	"github.com/ipld/go-car/v2"
	"github.com/ipld/go-car/v2/blockstore"
	"github.com/marukun712/polka/repo/repo"
	"github.com/marukun712/polka/repo/utils"
)

var r *repo.Repo

func openOrCreate(path string) (*os.File, error) {
	file, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open or create file: %w", err)
	}
	return file, nil
}

func open(did string) {
	ctx := context.Background()

	path := "./store/" + did + ".car"

	file, err := openOrCreate(path)
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	reader, err := car.OpenReader(path)
	if err != nil {
		log.Fatal(err)
	}
	defer reader.Close()

	roots, err := reader.Roots()
	if err != nil {
		log.Fatal(err)
	}

	bs, err := blockstore.OpenReadWrite(path, roots)
	if err != nil {
		log.Fatal(err)
	}
	defer bs.Close()

	r, err = repo.OpenRepo(ctx, bs, roots[0])
	if err != nil {
		log.Fatal(err)
	}
}

func createRecord(this js.Value, args []js.Value) interface{} {
	nsid := args[0].String()
	data := args[1].String()
	c, tid, err := r.CreateRecord(context.Background(), nsid, data)
	if err != nil {
		return js.ValueOf(err.Error())
	}
	return js.ValueOf(map[string]interface{}{
		"cid": c.String(),
		"tid": tid,
	})
}

func getRecord(this js.Value, args []js.Value) interface{} {
	rpath := args[0].String()
	c, rec, err := r.GetRecord(context.Background(), rpath)
	if err != nil {
		return js.ValueOf(err.Error())
	}
	return js.ValueOf(map[string]interface{}{
		"cid":  c.String(),
		"data": rec,
	})
}

func updateRecord(this js.Value, args []js.Value) interface{} {
	rpath := args[0].String()
	data := args[1].String()
	c, err := r.UpdateRecord(context.Background(), rpath, data)
	if err != nil {
		return js.ValueOf(err.Error())
	}
	return js.ValueOf(map[string]interface{}{
		"cid": c.String(),
	})
}

func deleteRecord(this js.Value, args []js.Value) interface{} {
	rpath := args[0].String()
	err := r.DeleteRecord(context.Background(), rpath)
	if err != nil {
		return js.ValueOf(err.Error())
	}
	return nil
}

func commit(this js.Value, args []js.Value) interface{} {
	sigStr := args[0].String()
	did := r.RepoDid()
	pubKey, err := utils.GetPk(did)
	if err != nil {
		return js.ValueOf(err.Error())
	}

	uc := r.SignedCommit()
	bytes, err := uc.Unsigned().BytesForSigning()
	if err != nil {
		return js.ValueOf(err.Error())
	}

	sig, err := hex.DecodeString(sigStr)
	if err != nil {
		return js.ValueOf(err.Error())
	}

	if !ed25519.Verify(pubKey, bytes, sig) {
		return js.ValueOf("signature verification failed")
	}

	cid, rev, err := r.Commit(context.Background(), r.SignedCommit())
	if err != nil {
		return js.ValueOf(err.Error())
	}
	return js.ValueOf(map[string]interface{}{
		"cid": cid.String(),
		"rev": rev,
	})
}

func main() {
	c := make(chan struct{}, 0)
	js.Global().Set("createRecord", js.FuncOf(createRecord))
	js.Global().Set("getRecord", js.FuncOf(getRecord))
	js.Global().Set("updateRecord", js.FuncOf(updateRecord))
	js.Global().Set("deleteRecord", js.FuncOf(deleteRecord))
	js.Global().Set("commit", js.FuncOf(commit))
	<-c
}
