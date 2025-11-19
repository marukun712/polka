package main

import (
	"github.com/marukun712/polka/repo/core"
	cbg "github.com/whyrusleeping/cbor-gen"
)

func main() {
	if err := cbg.WriteTupleEncodersToFile("core/cbor_gen.go", "core",
		core.SignedCommit{},
		core.UnsignedCommit{},
	); err != nil {
		panic(err)
	}
}
