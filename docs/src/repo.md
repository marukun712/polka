# リポジトリ仕様

polkaのリポジトリは、ATProtocolの仕様に基づいた静的ファイルベースのデータストレージです。

## 概要

ATProtocolのリポジトリ仕様の詳細は、[公式ドキュメント](https://atproto.com/specs/repository)を参照してください。

polkaでは、以下の特徴を持つリポジトリ実装を採用しています。

- **単一CARファイル**: ユーザーのすべてのデータが1つのCARファイルに格納
- **Merkle Search Tree**: レコードを効率的に検索・検証できるツリー構造
- **コミット署名**: リポジトリ全体に対する電子署名で完全性を保証
- **WASM統合**: Rust実装のatrium-repoをWebAssemblyで利用

## CAR (Content Addressable aRchives) 形式

### CAR v1仕様

polkaはCAR v1を使用します。ファイル構造は以下の通りです。

```
| varint(header_len) | DAG-CBOR(header) | block1 | block2 | ... |
```

各ブロックの構造:

```
| varint(block_len) | CID | content |
```

### ヘッダー構造

```typescript
{
  version: 1,
  roots: CID[]
}
```

ヘッダーはDAG-CBOR形式でエンコードされ、その長さが可変長整数で先頭に記録されます。

## BlockStore

BlockStoreは、CIDをキーとしてデータブロックを格納・取得する仕組みです。

### atrium-repoライブラリ

polkaでは、Rust実装の[atrium-repo](https://github.com/atrium-rs/atrium)をWASM経由で使用します。これにより、リポジトリのロジックを様々なランタイムや言語で動かすことができます。

## リポジトリ操作

polkaのリポジトリは、WASMモジュールを通じて操作されます。

### WITバインディング

WASMモジュールは、WITで定義されたインターフェースを通じてJavaScript/TypeScriptと連携します。

`polka:repository/blockstore`インターフェースを実装することで、WASMコード内からJavaScriptのブロックストアにアクセスできます。

### データ完全性の保証

1. **ルートCID**: MSTルート全体のハッシュ
2. **コミット署名**: ルートCIDを含むコミットオブジェクト全体に署名

### ホスティング先の変更

リポジトリを別の場所に移動する手順:

1. `repo.car`ファイルを新しいサーバーにコピー
2. DID Documentの`service[0].serviceEndpoint`を新しいURLに更新
3. 即座に新しいURLからデータが読み取り可能

中央サーバーへの登録や通知は一切不要です。どこでもホスティングできます。

### データのエクスポート

`~/.polka/repo/repo.car`ファイルをコピーするだけで、完全なバックアップが完了します。特別なエクスポート機能やフォーマット変換は不要です。

### プラットフォーム非依存

polkaのデータは、特定のプラットフォームやサービスに依存しません。

- GitHub Pages -> Cloudflare Pages への移行: 数分
- クラウド -> 自宅サーバー への移行: CARファイルをコピーするだけ
- 将来の新しいホスティングサービス: 静的ファイルが置ければOK
