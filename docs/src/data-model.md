# データモデル

polkaは、ATProtocolのリポジトリ形式を採用しています。このページでは、polkaで使用されるデータモデルの構造を説明します。

## collection/rkey

polkaのすべてのデータは、`collection/rkey` という形式のパスで管理されます。このパスを **rpath**と呼びます。

**collection**

データの種類を示す名前空間です。たとえば、`polka.profile` はプロフィールデータ、`polka.post` は投稿データを示します。

**rkey**

collection内でレコードを一意に識別するidです。TIDが使われます。TIDは、タイムスタンプをベースにした識別子で、作成順にソートされます。

## 標準collection

polkaで使用される主なcollectionを説明します。

### polka.profile/self

ユーザーのプロフィール情報を格納します。rpathは常に `polka.profile/self` で固定されています。

**含まれるフィールド**:
- `name`: 表示名
- `description`: プロフィールの説明
- `icon`: アイコンのURL
- `banner` (オプション): バナー画像のURL
- `updatedAt`: 最終更新日時

### polka.post/{tid}

投稿データを格納します。rkeyにはTIDが使われます。

**含まれるフィールド**:
- `content`: 投稿の本文(Markdown形式)
- `parents`: この投稿が属するタグの配列
- `updatedAt`: 最終更新日時

`parents` フィールドにタグを指定することで、投稿がどのタグに属するかを示します。複数のタグに同時に属することも可能です。

### polka.edge/{rkey}

タグの階層構造を定義します。`polka.edge` レコードは、あるタグから別のタグへのエッジを表します。

**含まれるフィールド**:
- `from` (オプション): 親タグ (省略時はルート)
- `to`: 子タグ
- `updatedAt`: 最終更新日時

たとえば、`japan` タグの下に `kokeshi` タグを作る場合、`from: "japan", to: "kokeshi"` というedgeレコードを作成します。

`from` を省略すると、ルート直下のタグとして扱われます。

### polka.link/{tid}

他のユーザーの投稿やデータへのリンクを表します。

**含まれるフィールド**:
- `ref`: 参照先(`did` と `rpath` を含むオブジェクト)
- `parents`: このリンクが属するタグの配列
- `updatedAt`: 最終更新日時

たとえば、Aliceさんの投稿を自分のタグに追加したい場合、その投稿への`ref`を含むlinkレコードを作成します。

### polka.follow/{rkey}

フォローしているユーザーのタグを記録します。

**含まれるフィールド**:
- `did`: フォロー対象のDID
- `tag`: フォローしているタグ
- `updatedAt`: 最終更新日時

たとえば、`did:web:alice.example.com` の `japan/kokeshi` タグをフォローする場合、`did: "did:web:alice.example.com", tag: "japan/kokeshi"` というfollowレコードを作成します。
