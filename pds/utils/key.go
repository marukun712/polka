package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"log"
)

func main() {
	pk, sk, err := ed25519.GenerateKey(nil)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("PublicKey:", hex.EncodeToString(pk))
	log.Println("SecretKey:", hex.EncodeToString(sk))
}
