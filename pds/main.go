package main

import (
	"context"
	"crypto/ed25519"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	leveldb "github.com/ipfs/go-ds-leveldb"
	"github.com/marukun712/polka/pds/peer"
	"github.com/marukun712/polka/pds/repo"
	"github.com/marukun712/polka/pds/utils"
)

type CommitRequest struct {
	SignedCommit repo.SignedCommit `json:"signed_commit"`
}

func main() {
	ctx := context.Background()
	dir := "./store"

	ds, err := leveldb.NewDatastore(dir, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	bs := blockstore.NewBlockstore(ds)

	did := "did:key:z6Mkqh5AD5V3GY6A8G7o7yD1Mjwp7RmpsRwidFTEsTPb5ow1"
	pk, err := utils.GetPk(did)
	if err != nil {
		log.Fatal(err)
	}

	r := repo.NewRepo(ctx, did, bs)
	if err != nil {
		log.Fatal(err)
	}

	router := gin.Default()

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Welcome to polka PDS!")
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	router.POST("/record", func(c *gin.Context) {
		var post struct {
			NSID string                 `json:"nsid"`
			Body map[string]interface{} `json:"body"`
		}
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if post.NSID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "nsid is required"})
			return
		}

		recordCid, tid, err := r.CreateRecord(ctx, post.NSID, post.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"cid": recordCid.String(), "tid": tid})
	})

	router.GET("/records", func(c *gin.Context) {
		nsid := c.Query("nsid")
		if nsid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "nsid query parameter required"})
			return
		}

		var records []gin.H
		err := r.ForEach(ctx, nsid, func(k string, v cid.Cid) error {
			_, rec, err := r.GetRecord(ctx, k)
			if err != nil {
				return err
			}
			records = append(records, gin.H{
				"key":    k,
				"cid":    v.String(),
				"record": rec,
			})
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, records)
	})

	router.GET("/record/:rpath/get", func(c *gin.Context) {
		rpath := c.Param("rpath")
		_, rec, err := r.GetRecord(ctx, rpath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"rpath":  rpath,
			"record": rec,
		})
	})

	router.PUT("/record/:rpath", func(c *gin.Context) {
		rpath := c.Param("rpath")
		var post map[string]interface{}
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		cid, err := r.UpdateRecord(ctx, rpath, post)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"cid": cid.String()})
	})

	router.DELETE("/record/:rpath", func(c *gin.Context) {
		rpath := c.Param("rpath")
		if err := r.DeleteRecord(ctx, rpath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	})

	router.POST("/commit", func(c *gin.Context) {
		var req CommitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ucBytes, err := req.SignedCommit.Unsigned().BytesForSigning()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !ed25519.Verify(pk, ucBytes, req.SignedCommit.Sig) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
			return
		}

		cid, rev, err := r.Commit(ctx, req.SignedCommit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"cid": cid.String(), "rev": rev})
	})

	router.GET("/commit", func(c *gin.Context) {
		c.JSON(http.StatusOK, r.SignedCommit())
	})

	router.GET("/root", func(c *gin.Context) {
		cid, err := r.GetCID(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, cid)
	})

	_, err = peer.StartPeer(router)
	if err != nil {
		log.Fatal(err)
	}
}
