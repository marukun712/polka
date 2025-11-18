package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/ipfs/go-cid"
	"github.com/ipld/go-car/v2"
	"github.com/ipld/go-car/v2/blockstore"
	"github.com/marukun712/polka/repo/core"
	wasm "github.com/marukun712/polka/repo/internal/polka/repo/repo"
	"github.com/marukun712/polka/repo/utils"
	"go.bytecodealliance.org/cm"
)

type CommitRequest struct {
	Did     string `json:"did"`
	Version int64  `json:"version"`
	Prev    string `json:"prev"`
	Data    string `json:"data"`
	Rev     string `json:"rev"`
}

var r *core.Repo

func openOrCreate(path string) (*os.File, error) {
	file, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open or create file: %w", err)
	}
	return file, nil
}

func init() {
	wasm.Exports.Open = func(did string) {
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

		r, err = core.OpenRepo(ctx, bs, roots[0])
		if err != nil {
			log.Fatal(err)
		}
	}

	wasm.Exports.CreateRecord = func(nsid string, data string) (result cm.Result[wasm.CreateResultShape, wasm.CreateResult, string]) {
		c, tid, err := r.CreateRecord(context.Background(), nsid, data)
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(wasm.CreateResult{
			Cid: c.String(),
			Tid: tid,
		})
		return result
	}

	wasm.Exports.GetRecord = func(rpath string) (result cm.Result[wasm.GetResultShape, wasm.GetResult, string]) {
		c, data, err := r.GetRecord(context.Background(), rpath)
		if err != nil {
			result.SetErr(err.Error())
		}
		json, err := json.Marshal(data)
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(wasm.GetResult{
			Cid:  c.String(),
			Data: string(json),
		})
		return result
	}

	wasm.Exports.UpdateRecord = func(rpath string, data string) (result cm.Result[string, bool, string]) {
		_, err := r.UpdateRecord(context.Background(), rpath, data)
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(true)
		return result
	}

	wasm.Exports.DeleteRecord = func(rpath string) (result cm.Result[string, bool, string]) {
		err := r.DeleteRecord(context.Background(), rpath)
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(true)
		return result
	}

	wasm.Exports.Commit = func(commit wasm.CommitRequest, sig string) (result cm.Result[string, bool, string]) {
		did := r.RepoDid()
		pubKey, err := utils.GetPk(did)
		if err != nil {
			result.SetErr(err.Error())
		}

		sigBytes, err := hex.DecodeString(sig)
		if err != nil {
			result.SetErr(err.Error())
		}

		bytes, err := json.Marshal(commit)
		if err != nil {
			result.SetErr(err.Error())
		}

		if !ed25519.Verify(pubKey, bytes, sigBytes) {
			result.SetErr("signature verification failed")
		}

		prev, err := cid.Decode(commit.Prev)
		if err != nil {
			result.SetErr(err.Error())
		}
		data, err := cid.Decode(commit.Data)
		if err != nil {
			result.SetErr(err.Error())
		}

		signed := core.SignedCommit{
			Did:     commit.Did,
			Version: commit.Version,
			Prev:    &prev,
			Data:    data,
			Sig:     sigBytes,
			Rev:     r.Clk.Next().String(),
		}

		_, _, err = r.Commit(context.Background(), signed)
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(true)

		return result
	}
}

func main() {}
