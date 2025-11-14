package utils

import (
	"crypto/ed25519"
	"fmt"
	"strings"

	"github.com/multiformats/go-multibase"
	"github.com/multiformats/go-multicodec"
	"github.com/multiformats/go-varint"
)

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
