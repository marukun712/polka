package main

import (
	"github.com/marukun712/polka/pds/repo"
	cbg "github.com/whyrusleeping/cbor-gen"
)

func main() {
	if err := cbg.WriteTupleEncodersToFile("repo/cbor_gen.go", "repo",
		repo.SignedCommit{},
		repo.UnsignedCommit{},
	); err != nil {
		panic(err)
	}
}
