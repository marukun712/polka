package repo

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/bluesky-social/indigo/atproto/repo"
	"github.com/bluesky-social/indigo/atproto/syntax"
	lexutil "github.com/bluesky-social/indigo/lex/util"
	"github.com/bluesky-social/indigo/mst"
	"github.com/bluesky-social/indigo/util"
	"github.com/ipfs/go-cid"
	cbor "github.com/ipfs/go-ipld-cbor"
	"github.com/ipld/go-car"
	cbg "github.com/whyrusleeping/cbor-gen"
	"go.opentelemetry.io/otel"
)

type SignedCommit struct {
	Pk   string   `json:"pk" cborgen:"pk"`
	Prev *cid.Cid `json:"prev" cborgen:"prev"`
	Data cid.Cid  `json:"data" cborgen:"data"`
	Sig  []byte   `json:"sig" cborgen:"sig"`
}

type UnsignedCommit struct {
	Pk   string   `cborgen:"pk"`
	Prev *cid.Cid `cborgen:"prev"`
	Data cid.Cid  `cborgen:"data"`
}

type Repo struct {
	sc  SignedCommit
	cst cbor.IpldStore
	bs  cbor.IpldBlockstore

	repoCid cid.Cid

	mst *mst.MerkleSearchTree

	dirty bool

	clk *syntax.TIDClock
}

// Returns a copy of commit without the Sig field. Helpful when verifying signature.
func (sc *SignedCommit) Unsigned() *UnsignedCommit {
	return &UnsignedCommit{
		Prev: sc.Prev,
		Data: sc.Data,
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

func IngestRepo(ctx context.Context, bs cbor.IpldBlockstore, r io.Reader) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "Ingest")
	defer span.End()

	br, err := car.NewCarReader(r)
	if err != nil {
		return cid.Undef, fmt.Errorf("opening CAR block reader: %w", err)
	}

	for {
		blk, err := br.Next()
		if err != nil {
			if err == io.EOF {
				break
			}
			return cid.Undef, fmt.Errorf("reading block from CAR: %w", err)
		}

		if err := bs.Put(ctx, blk); err != nil {
			return cid.Undef, fmt.Errorf("copying block to store: %w", err)
		}
	}

	return br.Header.Roots[0], nil
}

func ReadRepoFromCar(ctx context.Context, r io.Reader) (*Repo, error) {
	bs := repo.NewTinyBlockstore()
	root, err := IngestRepo(ctx, bs, r)
	if err != nil {
		return nil, fmt.Errorf("ReadRepoFromCar:IngestRepo: %w", err)
	}

	return OpenRepo(ctx, bs, root)
}

func NewRepo(ctx context.Context, did string, bs cbor.IpldBlockstore) *Repo {
	cst := util.CborStore(bs)
	clk := syntax.NewTIDClock(0)

	t := mst.NewEmptyMST(cst)
	sc := SignedCommit{}

	return &Repo{
		cst:   cst,
		bs:    bs,
		mst:   t,
		sc:    sc,
		dirty: true,
		clk:   &clk,
	}
}

func OpenRepo(ctx context.Context, bs cbor.IpldBlockstore, root cid.Cid) (*Repo, error) {
	cst := util.CborStore(bs)
	clk := syntax.NewTIDClock(0)

	var sc SignedCommit
	if err := cst.Get(ctx, root, &sc); err != nil {
		return nil, fmt.Errorf("loading root from blockstore: %w", err)
	}

	return &Repo{
		sc:      sc,
		bs:      bs,
		cst:     cst,
		repoCid: root,
		clk:     &clk,
	}, nil
}

type CborMarshaler interface {
	MarshalCBOR(w io.Writer) error
}

func (r *Repo) RepoPk() string {
	if r.sc.Pk == "" {
		panic("repo has unset did")
	}

	return r.sc.Pk
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

func (r *Repo) CreateRecord(ctx context.Context, nsid string, rec CborMarshaler) (cid.Cid, string, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "CreateRecord")
	defer span.End()

	r.dirty = true
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("failed to get mst: %w", err)
	}

	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, "", err
	}

	tid := r.clk.Next().String()

	nmst, err := t.Add(ctx, nsid+"/"+tid, k, -1)
	if err != nil {
		return cid.Undef, "", fmt.Errorf("mst.Add failed: %w", err)
	}

	r.mst = nmst
	return k, tid, nil
}

func (r *Repo) PutRecord(ctx context.Context, rpath string, rec CborMarshaler) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "PutRecord")
	defer span.End()

	r.dirty = true
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

	nmst, err := t.Add(ctx, rpath, k, -1)
	if err != nil {
		return cid.Undef, fmt.Errorf("mst.Add failed: %w", err)
	}

	r.mst = nmst
	return k, nil
}

func (r *Repo) UpdateRecord(ctx context.Context, rpath string, rec CborMarshaler) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "UpdateRecord")
	defer span.End()

	r.dirty = true
	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to get mst: %w", err)
	}

	k, err := r.cst.Put(ctx, rec)
	if err != nil {
		return cid.Undef, err
	}

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

	r.dirty = true
	t, err := r.getMst(ctx)
	if err != nil {
		return fmt.Errorf("failed to get mst: %w", err)
	}

	nmst, err := t.Delete(ctx, rpath)
	if err != nil {
		return fmt.Errorf("mst.Add failed: %w", err)
	}

	r.mst = nmst
	return nil
}

// truncates history while retaining the same data root
func (r *Repo) Truncate() {
	r.sc.Prev = nil
	r.repoCid = cid.Undef
}

// creates and writes a new SignedCommit for this repo, with `prev` pointing to old value
func (r *Repo) Commit(ctx context.Context, signer func(context.Context, string, []byte) ([]byte, error)) (cid.Cid, error) {
	ctx, span := otel.Tracer("repo").Start(ctx, "Commit")
	defer span.End()

	t, err := r.getMst(ctx)
	if err != nil {
		return cid.Undef, err
	}

	rcid, err := t.GetPointer(ctx)
	if err != nil {
		return cid.Undef, err
	}

	ncom := UnsignedCommit{
		Pk:   r.RepoPk(),
		Data: rcid,
	}

	sb, err := ncom.BytesForSigning()
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to serialize commit: %w", err)
	}
	sig, err := signer(ctx, ncom.Pk, sb)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to sign root: %w", err)
	}

	nsc := SignedCommit{
		Sig:  sig,
		Pk:   ncom.Pk,
		Prev: ncom.Prev,
		Data: ncom.Data,
	}

	nsccid, err := r.cst.Put(ctx, &nsc)
	if err != nil {
		return cid.Undef, err
	}

	r.sc = nsc
	r.dirty = false

	return nsccid, nil
}

func (r *Repo) getMst(ctx context.Context) (*mst.MerkleSearchTree, error) {
	if r.mst != nil {
		return r.mst, nil
	}

	t := mst.LoadMST(r.cst, r.sc.Data)
	r.mst = t
	return t, nil
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
