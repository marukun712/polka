package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/multiformats/go-multibase"
	"github.com/multiformats/go-multicodec"
	"github.com/multiformats/go-varint"
)

func main() {
	pk, sk, err := ed25519.GenerateKey(rand.Reader)
	skStr := hex.EncodeToString(sk)
	if err != nil {
		panic(err)
	}
	prefix := varint.ToUvarint(uint64(multicodec.Ed25519Pub))
	mcpk := append(prefix, pk...)
	encoded, err := multibase.Encode(multibase.Base58BTC, mcpk)
	if err != nil {
		panic(err)
	}
	did := fmt.Sprintf("did:key:%s", encoded)
	fmt.Printf("%s\n%s", did, skStr)
}
