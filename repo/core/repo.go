package core

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/bluesky-social/indigo/atproto/syntax"
	lexutil "github.com/bluesky-social/indigo/lex/util"
	"github.com/ipfs/go-cid"
	cbor "github.com/ipfs/go-ipld-cbor"
	"github.com/marukun712/polka/repo/mst"
	mh "github.com/multiformats/go-multihash"
	cbg "github.com/whyrusleeping/cbor-gen"
	"go.opentelemetry.io/otel"
)

// current version of repo currently implemented
const ATP_REPO_VERSION int64 = 3

const ATP_REPO_VERSION_2 int64 = 2

type SignedCommit struct {
	Did     string   `json:"did" cborgen:"did"`
	Version int64    `json:"version" cborgen:"version"`
	Prev    *cid.Cid `json:"prev" cborgen:"prev"`
	Data    cid.Cid  `json:"data" cborgen:"data"`
	Sig     []byte   `json:"sig" cborgen:"sig"`
	Rev     string   `json:"rev" cborgen:"rev,omitempty"`
}

type UnsignedCommit struct {
	Did     string   `cborgen:"did"`
	Version int64    `cborgen:"version"`
	Prev    *cid.Cid `cborgen:"prev"`
	Data    cid.Cid  `cborgen:"data"`
	Rev     string   `cborgen:"rev,omitempty"`
}

type Repo struct {
	sc  SignedCommit
	cst cbor.IpldStore
	bs  cbor.IpldBlockstore

	repoCid cid.Cid

	mst *mst.MerkleSearchTree

	dirty bool

	Clk *syntax.TIDClock
}

// Returns a copy of commit without the Sig field. Helpful when verifying signature.
func (sc *SignedCommit) Unsigned() *UnsignedCommit {
	return &UnsignedCommit{
		Did:     sc.Did,
		Version: sc.Version,
		Prev:    sc.Prev,
		Data:    sc.Data,
		Rev:     sc.Rev,
	}
}

// returns bytes of the DAG-CBOR representation of object. This is what gets
// signed; the `go-did` library will take the SHA-256 of the bytes and sign
// that.
func (uc *UnsignedCommit) BytesForSigning() ([]byte, error) {
	buf := new(bytes.Buffer)
	if err := uc.MarshalCBOR(buf); err != nil {
		return []byte{}, err
	}
	return buf.Bytes(), nil
}

func CborStore(bs cbor.IpldBlockstore) *cbor.BasicIpldStore {
	cst := cbor.NewCborStore(bs)
	cst.DefaultMultihash = mh.SHA2_256
	return cst
}

func OpenRepo(ctx context.Context, bs cbor.IpldBlockstore, root cid.Cid) (*Repo, error) {
	cst := CborStore(bs)
	Clk := syntax.NewTIDClock(0)

	var sc SignedCommit
	if err := cst.Get(ctx, root, &sc); err != nil {
		return nil, fmt.Errorf("loading root from blockstore: %w", err)
	}

	if sc.Version != ATP_REPO_VERSION && sc.Version != ATP_REPO_VERSION_2 {
		return nil, fmt.Errorf("unsupported repo version: %d", sc.Version)
	}

	return &Repo{
		sc:      sc,
		bs:      bs,
		cst:     cst,
		repoCid: root,
		Clk:     &Clk,
	}, nil
}

type CborMarshaler interface {
	MarshalCBOR(w io.Writer) error
}

func (r *Repo) RepoDid() string {
	if r.sc.Did == "" {
		panic("repo has unset did")
	}

	return r.sc.Did
}

// TODO(bnewbold): this could return just *cid.Cid
func (r *Repo) PrevCommit(ctx context.Context) (*cid.Cid, error) {
	return r.sc.Prev, nil
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

	r.dirty = true

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("failed to get mst: %w", err)
	}

	// BlockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, "", err
	}

	// ClockからTIDを取得(時系列ソートのため)
	tid := r.Clk.Next().String()

	// MSTに追加
	nmst, err := t.Add(ctx, nsid+"/"+tid, k, -1)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, tid, nil
}

// Path(nsid/tid)を指定してRecordを置く
func (r *Repo) PutRecord(ctx context.Context, rpath string, rec interface{}) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "PutRecord")
	defer span.End()

	r.dirty = true

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	// BlockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

	// MSTに追加
	nmst, err := t.Add(ctx, rpath, k, -1)
	if err != nil {
		return cid.Undef, fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, nil
}

// Path(nsid/tid)を指定してRecordを更新する
func (r *Repo) UpdateRecord(ctx context.Context, rpath string, rec interface{}) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "UpdateRecord")
	defer span.End()

	r.dirty = true

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	// BlockStoreに保存
	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

	// MSTに追加
	nmst, err := t.Update(ctx, rpath, k)
	if err != nil {
		return cid.Undef, fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return k, nil
}

// Path(nsid/tid)を指定してRecordを削除する
func (r *Repo) DeleteRecord(ctx context.Context, rpath string) error {
	ctx, span := otel.Tracer("repo").Start(ctx, "DeleteRecord")
	defer span.End()

	r.dirty = true

	// MSTを取得
	t, err := r.getMst(ctx)
	if err != nil {
		return fmt.Errorf("failed to get mst: %w", err)
	}

	// BlockStoreから削除
	nmst, err := t.Delete(ctx, rpath)
	if err != nil {
		return fmt.Errorf("mst.Add failed: %w", err)
	}
	r.mst = nmst

	return nil
}

// Commitする(署名済みを外部からHTTPなどで受け取る)
func (r *Repo) Commit(ctx context.Context, signed SignedCommit) (cid.Cid, string, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "Commit")
	defer span.End()

	nsccid, err := r.cst.Put(ctx, &signed)
	if err != nil {
		return cid.Undef, "", err
	}

	r.sc = signed
	r.dirty = false

	return nsccid, signed.Rev, nil
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

func (r *Repo) DiffSince(ctx context.Context, oldrepo cid.Cid) ([]*mst.DiffOp, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "DiffSince")
	defer span.End()

	var oldTree cid.Cid
	if oldrepo.Defined() {
		otherRepo, err := OpenRepo(ctx, r.bs, oldrepo)
		if err != nil {
			return nil, err
		}

		oldmst, err := otherRepo.getMst(ctx)
		if err != nil {
			return nil, err
		}

		oldptr, err := oldmst.GetPointer(ctx)
		if err != nil {
			return nil, err
		}
		oldTree = oldptr
	}

	curmst, err := r.getMst(ctx)
	if err != nil {
		return nil, err
	}

	curptr, err := curmst.GetPointer(ctx)
	if err != nil {
		return nil, err
	}

	return mst.DiffTrees(ctx, r.bs, oldTree, curptr)
}

func (r *Repo) CopyDataTo(ctx context.Context, bs cbor.IpldBlockstore) error {
	return copyRecCbor(ctx, r.bs, bs, r.sc.Data, make(map[cid.Cid]struct{}))
}

func copyRecCbor(ctx context.Context, from, to cbor.IpldBlockstore, c cid.Cid, seen map[cid.Cid]struct{}) error {
	if _, ok := seen[c]; ok {
		return nil
	}
	seen[c] = struct{}{}

	blk, err := from.Get(ctx, c)
	if err != nil {
		return err
	}

	if err := to.Put(ctx, blk); err != nil {
		return err
	}

	var out []cid.Cid
	if err := cbg.ScanForLinks(bytes.NewReader(blk.RawData()), func(c cid.Cid) {
		out = append(out, c)
	}); err != nil {
		return err
	}

	for _, child := range out {
		if err := copyRecCbor(ctx, from, to, child, seen); err != nil {
			return err
		}
	}

	return nil
}
