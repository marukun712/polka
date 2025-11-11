package repo

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"fmt"

	lexutil "github.com/bluesky-social/indigo/lex/util"
	"github.com/bluesky-social/indigo/mst"
	"github.com/bluesky-social/indigo/util"
	"github.com/google/uuid"
	"github.com/ipfs/go-cid"
	cbor "github.com/ipfs/go-ipld-cbor"
	cbg "github.com/whyrusleeping/cbor-gen"
	"go.opentelemetry.io/otel"
)

type SignedCommit struct {
	Data cid.Cid `json:"data" cborgen:"data"`
	Sig  []byte  `json:"sig" cborgen:"sig"`
}

type UnsignedCommit struct {
	Data cid.Cid `cborgen:"data"`
}

type Repo struct {
	pk  ed25519.PublicKey
	sc  SignedCommit
	cst cbor.IpldStore
	bs  cbor.IpldBlockstore

	repoCid cid.Cid

	mst *mst.MerkleSearchTree
}

func (uc *UnsignedCommit) BytesForSigning() ([]byte, error) {
	buf := new(bytes.Buffer)
	if err := uc.MarshalCBOR(buf); err != nil {
		return []byte{}, err
	}
	return buf.Bytes(), nil
}

func NewRepo(ctx context.Context, pk ed25519.PublicKey, bs cbor.IpldBlockstore) *Repo {
	cst := util.CborStore(bs)

	t := mst.NewEmptyMST(cst)
	sc := SignedCommit{}

	return &Repo{
		pk:  pk,
		cst: cst,
		bs:  bs,
		mst: t,
		sc:  sc,
	}
}

func OpenRepo(ctx context.Context, pk ed25519.PublicKey, bs cbor.IpldBlockstore, root cid.Cid) (*Repo, error) {
	cst := util.CborStore(bs)

	var sc SignedCommit
	if err := cst.Get(ctx, root, &sc); err != nil {
		return nil, fmt.Errorf("loading root from blockstore: %w", err)
	}

	return &Repo{
		pk:      pk,
		sc:      sc,
		bs:      bs,
		cst:     cst,
		repoCid: root,
	}, nil
}

func (r *Repo) DataCid() cid.Cid {
	return r.sc.Data
}

func (r *Repo) SignedCommit() SignedCommit {
	return r.sc
}

func (r *Repo) Blockstore() cbor.IpldBlockstore {
	return r.bs
}

// レコードの作成
func (r *Repo) CreateRecord(ctx context.Context, nsid string, rec interface{}) (cid.Cid, string, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "CreateRecord")
	defer span.End()

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("failed to get mst: %w", err)
	}

	// blockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, "", err
	}

	uuid := uuid.NewString()

	// MSTに追加してMSTを上書き
	nmst, err := t.Add(ctx, nsid+"/"+uuid, k, -1)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, uuid, nil
}

func (r *Repo) PutRecord(ctx context.Context, rpath string, rec interface{}) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "PutRecord")
	defer span.End()

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	// blockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

	// MSTに追加してMSTを上書き
	nmst, err := t.Add(ctx, rpath, k, -1)
	if err != nil {
		return cid.Undef, fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, nil
}

func (r *Repo) UpdateRecord(ctx context.Context, rpath string, rec interface{}) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "UpdateRecord")
	defer span.End()

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	// blockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

	// MSTに追加してMSTを上書き
	nmst, err := t.Update(ctx, rpath, k)
	if err != nil {
		return cid.Undef, fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, nil
}

func (r *Repo) DeleteRecord(ctx context.Context, rpath string) error {
	ctx, span := otel.Tracer("repo").Start(ctx, "DeleteRecord")
	defer span.End()

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return fmt.Errorf("failed to get mst: %w", err)
	}

	// MSTから消してMSTを上書き
	nmst, err := t.Delete(ctx, rpath)
	if err != nil {
		return fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return nil
}

// 署名コミットを書き込む
func (r *Repo) Commit(ctx context.Context, signed SignedCommit) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "Commit")
	defer span.End()

	commitCid, err := r.cst.Put(ctx, &signed)
	if err != nil {
		return cid.Undef, err
	}

	r.sc = signed

	return commitCid, nil
}

func (r *Repo) getMst(ctx context.Context) (*mst.MerkleSearchTree, error) {
	if r.mst != nil {
		return r.mst, nil
	}

	t := mst.LoadMST(r.cst, r.sc.Data)
	r.mst = t
	return t, nil
}

func (r *Repo) GetCID(ctx context.Context) (cid.Cid, error) {
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, err
	}

	rcid, err := t.GetPointer(ctx)
	if err != nil {
		return cid.Undef, err
	}

	return rcid, nil
}

var ErrDoneIterating = fmt.Errorf("done iterating")

func (r *Repo) ForEach(ctx context.Context, prefix string, cb func(k string, v cid.Cid) error) error {
	ctx, span := otel.Tracer("repo").Start(ctx, "ForEach")
	defer span.End()

	t := mst.LoadMST(r.cst, r.sc.Data)

	if err := t.WalkLeavesFrom(ctx, prefix, cb); err != nil {
		if err != ErrDoneIterating {
			return err
		}
	}

	return nil
}

func (r *Repo) GetRecord(ctx context.Context, rpath string) (cid.Cid, cbg.CBORMarshaler, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "GetRecord")
	defer span.End()

	cc, recB, err := r.GetRecordBytes(ctx, rpath)
	if err != nil {
		return cid.Undef, nil, err
	}

	if recB == nil {
		return cid.Undef, nil, fmt.Errorf("empty record bytes")
	}

	rec, err := lexutil.CborDecodeValue(*recB)
	if err != nil {
		return cid.Undef, nil, err
	}

	return cc, rec, nil
}

func (r *Repo) GetRecordBytes(ctx context.Context, rpath string) (cid.Cid, *[]byte, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "GetRecordBytes")
	defer span.End()

	mst, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, nil, fmt.Errorf("getting repo mst: %w", err)
	}

	cc, err := mst.Get(ctx, rpath)
	if err != nil {
		return cid.Undef, nil, fmt.Errorf("resolving rpath within mst: %w", err)
	}

	blk, err := r.bs.Get(ctx, cc)
	if err != nil {
		return cid.Undef, nil, err
	}

	raw := blk.RawData()

	return cc, &raw, nil
}
