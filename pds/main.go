package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/marukun712/polka/pds/ent"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
)

func main() {
	client, err := ent.Open("sqlite3", "file:repo.db?_fk=1")
	if err != nil {
		log.Fatalf("failed opening connection to sqlite: %v", err)
	}
	defer client.Close()

	if err := client.Schema.Create(context.Background()); err != nil {
		log.Fatalf("failed creating schema resources: %v", err)
	}

	ctx := context.Background()
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Welcome to polka PDS!",
		})
	})

	r.POST("/put", func(c *gin.Context) {
		var json ent.Record
		if err := c.ShouldBindJSON(&json); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		r, err := PutRecord(ctx, client, json)
		if err != nil {
			log.Fatalf("failed putting record: %v", err)
		}
		c.JSON(http.StatusOK, r)
	})

	if err := r.Run(); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

func PutRecord(ctx context.Context, client *ent.Client, record ent.Record) (*ent.Record, error) {
	r, err := client.Record.
		Create().SetID(record.ID).SetContent(record.Content).SetSig(record.Sig).SetPk(record.Pk).Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed creating user: %w", err)
	}
	log.Println("record was created: ", r)
	return r, nil
}
