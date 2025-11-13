package utils

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

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

func GetPk(did string) (ed25519.PublicKey, error) {
	const prefix = "did:key:"
	if !strings.HasPrefix(did, prefix) {
		return nil, fmt.Errorf("invalid did:key prefix")
	}

	encoded := strings.TrimPrefix(did, prefix)
	_, decoded, err := multibase.Decode(encoded)
	if err != nil {
		return nil, fmt.Errorf("Error: %w", err)
	}

	code, n, err := varint.FromUvarint(decoded)
	if err != nil {
		return nil, fmt.Errorf("Error: %w", err)
	}
	if n <= 0 {
		return nil, fmt.Errorf("failed to parse varint")
	}
	if multicodec.Code(code) != multicodec.Ed25519Pub {
		return nil, fmt.Errorf("unsupported multicodec: %x", code)
	}

	pubKeyBytes := decoded[n:]
	if len(pubKeyBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid pubkey length: %d", len(pubKeyBytes))
	}

	return ed25519.PublicKey(pubKeyBytes), nil
}
