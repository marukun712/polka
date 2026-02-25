# アイデンティティと検証

## did:webによる紐付け

polkaは、ドメイン名と公開鍵を紐付ける仕組みとして、did:webを採用しています。

### did:webとは

did:webは、W3Cが標準化したDecentralized Identifierの一種で、Webドメインを使ったDIDです。

`did:web:example.com` というDIDは、`https://example.com/.well-known/did.json` にあるDID Documentを指します。

DID Documentには、そのDIDに紐づく公開鍵とサービスエンドポイントが記載されています。

## DID Documentの構造

DID Documentは、JSON形式で記述されます。polkaで使用される典型的なDID Documentは以下のような構造を持ちます。

**verificationMethod**

公開鍵のリストです。各公開鍵には一意のIDが付けられます。

**assertionMethod**

署名検証に使用する鍵のリストです。`verificationMethod` で定義された鍵のIDを参照します。

**service**

polkaリポジトリのサービスエンドポイントです。クライアントは、このエンドポイントからデータブロックを取得します。

idは#polkaである必要があります。(例:did:web:example.com#polka)

## 複数鍵対応の仕組み

polkaは、複数の公開鍵をサポートしています。

### なぜ複数鍵が必要か

**鍵のローテーション**
秘密鍵が漏洩した可能性がある場合、新しい鍵に切り替える必要があります。複数鍵に対応していれば、古い鍵を無効化しながら新しい鍵を追加できます。

**複数デバイスでの運用**
デスクトップとモバイルで異なる鍵を使いたい場合、それぞれの鍵をDID Documentに登録できます。

### 検証の仕組み

クライアントがデータを検証する際、`assertionMethod` に含まれるいずれかの鍵で署名が検証できれば、そのデータを正当なものとして受け入れます。

すべての鍵で検証する必要はありません。1つでも検証に成功すれば十分です。

## DID解決の流れ

polkaでのDID解決は、以下の手順で行われます。

**1. DID DocumentのURL構築**
`did:web:example.com` というDIDから、`https://example.com/.well-known/did.json` というURLを構築します。

**2. HTTPS経由で取得**
構築したURLに HTTPSリクエストを送り、DID Documentを取得します。

**3. 公開鍵の抽出**
`verificationMethod` から公開鍵を抽出し、`assertionMethod` で参照されている鍵のリストを得ます。

**4. サービスエンドポイントの抽出**
`service` から、polkaリポジトリのサービスエンドポイントを抽出します。idが `#polka` のサービスを探します。

**5. データ取得と検証**
サービスエンドポイントからデータを取得し、抽出した公開鍵で署名を検証します。
