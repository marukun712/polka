package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	leveldb "github.com/ipfs/go-ds-leveldb"
	gostream "github.com/libp2p/go-libp2p-gostream"
	p2phttp "github.com/libp2p/go-libp2p-http"
	"github.com/marukun712/polka/pds/peer"
	"github.com/marukun712/polka/pds/repo"
	"github.com/marukun712/polka/pds/utils"
)

type CommitRequest struct {
	Did     string `json:"did"`
	Version int64  `json:"version"`
	Prev    string `json:"prev"`
	Data    string `json:"data"`
	Sig     string `json:"sig"`
	Rev     string `json:"rev"`
}

type CommitRequestUnSigned struct {
	Did     string `json:"did"`
	Version int64  `json:"version"`
	Prev    string `json:"prev"`
	Data    string `json:"data"`
	Rev     string `json:"rev"`
}

type CreateRequest struct {
	NSID string                 `json:"nsid"`
	Body map[string]interface{} `json:"body"`
	Sig  string                 `json:"sig"`
}

type CreateRequestUnSigned struct {
	NSID string                 `json:"nsid"`
	Body map[string]interface{} `json:"body"`
}

type PutRequest struct {
	Body map[string]interface{} `json:"body"`
	Sig  string                 `json:"sig"`
}

type PutRequestUnSigned struct {
	Body map[string]interface{} `json:"body"`
}

type DeleteRequest struct {
	Rkey string `json:"rkey"`
	Sig  string `json:"sig"`
}

type DeleteRequestUnSigned struct {
	Rkey string `json:"rkey"`
}

type Announce struct {
	Did  string `json:"did"`
	NSID string `json:"nsid"`
	Rkey string `json:"rkey"`
	Root string `json:"root"`
	Sig  string `json:"sig"`
}

func main() {
	ctx := context.Background()

	// BlockStoreの設定
	dir := "./store"
	ds, err := leveldb.NewDatastore(dir, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	bs := blockstore.NewBlockstore(ds)

	// リポジトリ所有者didの設定
	did := "did:key:z6MkpsxQQF8sedejx1v9wYfubLiNWVVoxTFmornuJS7WCLkk"
	pk, err := utils.GetPk(did)
	if err != nil {
		log.Fatal(err)
	}

	// repoを作成
	r := repo.NewRepo(ctx, did, bs)
	if err != nil {
		log.Fatal(err)
	}

	// libp2pピアを取得
	h, t, err := peer.GetPeer(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// routerを作成
	router := gin.Default()

	// 認証なしのroute
	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Welcome to polka PDS!")
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// nsidからレコードを列挙
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

	// rkeyからレコードを取得
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

	// 最新のコミットを取得
	router.GET("/commit", func(c *gin.Context) {
		c.JSON(http.StatusOK, r.SignedCommit())
	})

	// 最新のルートCIDを取得
	router.GET("/root", func(c *gin.Context) {
		cid, err := r.GetCID(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, cid)
	})

	// 本人の署名が必要なroute
	// レコードを書き込み
	router.POST("/record", func(c *gin.Context) {
		var post CreateRequest
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		unSigned := CreateRequestUnSigned{
			NSID: post.NSID,
			Body: post.Body,
		}

		bytes, err := json.Marshal(unSigned)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		sigBytes, err := hex.DecodeString(post.Sig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !ed25519.Verify(pk, bytes, sigBytes) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
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

		cid, err := r.GetCID(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		a := &Announce{
			Did:  did,
			NSID: post.NSID,
			Rkey: tid,
			Root: cid.String(),
		}
		aBytes, err := json.Marshal(a)
		t.Publish(ctx, aBytes)

		c.JSON(http.StatusOK, gin.H{"cid": recordCid.String(), "tid": tid})
	})

	// レコードを更新
	router.PUT("/record/:rpath", func(c *gin.Context) {
		rpath := c.Param("rpath")
		var post PutRequest
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		unSigned := PutRequestUnSigned{
			Body: post.Body,
		}

		bytes, err := json.Marshal(unSigned)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		sigBytes, err := hex.DecodeString(post.Sig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !ed25519.Verify(pk, bytes, sigBytes) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
			return
		}

		cid, err := r.UpdateRecord(ctx, rpath, post)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"cid": cid.String()})
	})

	// レコードを削除
	router.DELETE("/record/:rpath", func(c *gin.Context) {
		rpath := c.Param("rpath")
		var post DeleteRequest
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		unSigned := DeleteRequestUnSigned{
			Rkey: post.Rkey,
		}

		bytes, err := json.Marshal(unSigned)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		sigBytes, err := hex.DecodeString(post.Sig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !ed25519.Verify(pk, bytes, sigBytes) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
			return
		}

		if err := r.DeleteRecord(ctx, rpath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	})

	// コミットを確定
	router.POST("/commit", func(c *gin.Context) {
		var post CommitRequest
		if err := c.ShouldBindJSON(&post); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		unSigned := CommitRequestUnSigned{
			Did:     post.Did,
			Version: post.Version,
			Prev:    post.Prev,
			Data:    post.Data,
			Rev:     post.Rev,
		}

		bytes, err := json.Marshal(unSigned)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		sigBytes, err := hex.DecodeString(post.Sig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if !ed25519.Verify(pk, bytes, sigBytes) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
			return
		}

		prev, err := cid.Decode(post.Prev)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		data, err := cid.Decode(post.Data)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		commit := repo.SignedCommit{
			Did:     post.Did,
			Version: post.Version,
			Prev:    &prev,
			Data:    data,
			Sig:     sigBytes,
			Rev:     r.Clk.Next().String(),
		}

		cid, rev, err := r.Commit(ctx, commit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"cid": cid.String(), "rev": rev})
	})

	// サーバーを起動
	listener, err := gostream.Listen(h, p2phttp.DefaultP2PProtocol)
	if err != nil {
		log.Fatal(err)
	}
	go func() {
		server := &http.Server{
			Handler: router,
		}
		log.Println("HTTP server started on libp2p protocol")
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Println("Server error:", err)
		}
	}()

	select {}
}
