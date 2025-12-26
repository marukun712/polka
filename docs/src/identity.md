# アイデンティティ

polkaは、did:webを使ったドメインベースのアイデンティティ管理を採用しています。

**重要**: polkaはdid:webを基本的なアイデンティティの仕組みとして採用していますが、これは変更される可能性があります。
did:webにはドメインの変更でソーシャルグラフが失われてしまうなどの課題があります。

## did:webとは

did:webは、[W3C DID仕様](https://www.w3.org/TR/did-1.0/)に基づく分散型識別子(DID)の一種で、DNSを利用したアイデンティティです。

### polkaでdid:webを採用する理由

- **人間が読めるID**: `did:web:example.com`のように、わかりやすい識別子
- **簡単なセットアップ**: 既存のWebサーバーに静的ファイルを配置するだけ
- **ドメインとの紐付け**: ドメインがそのままアイデンティティになる

### did:webの形式

```
did:web:example.com
did:web:example.com:user:alice
did:web:subdomain.example.com
```

## DID Documentの構造

DID Documentは、アイデンティティに関する情報を記述したJSON形式のファイルです。

### polkaのDID Document例

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1"
  ],
  "id": "did:web:example.com",
  "verificationMethod": [{
    "id": "did:web:example.com#keys-1",
    "controller": "did:web:example.com",
    "type": "EcdsaSecp256k1Signature2019",
    "publicKeyMultibase": "pk..."
  }],
  "assertionMethod": ["did:web:example.com#keys-1"],
  "service": [{
    "id": "did:web:example.com#linked-domain",
    "type": "LinkedDomains",
    "serviceEndpoint": "https://example.com"
  }]
}
```

## DID解決プロセス

did:webの解決は、HTTPSリクエストでDID Documentを取得するプロセスです。

### 解決アルゴリズム

1. `did:web:example.com`を`https://example.com/.well-known/did.json`に変換
2. HTTPSでGET リクエストを送信
3. DID Documentを取得
4. `verificationMethod`から公開鍵を抽出
5. `service[0].serviceEndpoint`からリポジトリURLを解決

## 署名検証

polkaのリポジトリは、コミットに電子署名を行うことでデータの完全性と所有権を保証します。

### コミット署名の構造

リポジトリのルートCIDが指すコミットブロックは、以下の構造を持ちます。

```typescript
{
  sig: Uint8Array,
  version: 3,
  did: string,
  data: CID,
  rev: string,
  prev: CID | null
}
```

### 署名検証フロー

1. リポジトリのルートCIDからコミットブロックを取得
2. DAG-CBORでデコード
3. `sig`フィールドと残りのフィールドを分離
4. 残りのフィールドを再エンコード(署名対象データ)
5. did:keyとsigを使って署名検証

### 署名検証の重要性

署名検証により、以下を保証します。

- **データの完全性**: リポジトリの内容が改ざんされていないこと
- **所有権の証明**: did:webの所有者が実際にこのリポジトリを作成したこと
