package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"log"

	"github.com/ipfs/go-cid"
	"github.com/marukun712/polka/repo/blockstore"
	"github.com/marukun712/polka/repo/core"
	wasm "github.com/marukun712/polka/repo/internal/polka/repository/repo"
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

func init() {
	wasm.Exports.Open = func(did string, bs cm.Rep, rootCid string) {
		ctx := context.Background()

		bsHandle := cm.Reinterpret[wasm.Blockstore](bs)

		rootCidParsed, err := cid.Decode(rootCid)
		if err != nil {
			log.Fatalf("failed to parse root CID: %v", err)
		}

		bsAdapter := blockstore.NewWitBlockstore(bsHandle)

		r, err = core.OpenRepo(ctx, bsAdapter, rootCidParsed)
		if err != nil {
			log.Fatalf("failed to open repository: %v", err)
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

	wasm.Exports.GetUnsigned = func() (result cm.Result[wasm.UnsignedShape, wasm.Unsigned, string]) {
		uc, err := r.GetUnsigned(context.Background())
		if err != nil {
			result.SetErr(err.Error())
		}
		result.SetOK(uc)
		return result
	}

	wasm.Exports.Commit = func(commit wasm.Unsigned, sig string) (result cm.Result[string, bool, string]) {
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

		data, err := cid.Decode(commit.Data)
		if err != nil {
			result.SetErr(err.Error())
		}

		signed := core.SignedCommit{
			Did:     commit.Did,
			Version: commit.Version,
			Data:    data,
			Sig:     sigBytes,
			Rev:     r.GetClock(),
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
