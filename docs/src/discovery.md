# 発見メカニズムの詳細

polkaでは、Nostrリレーを使って他のユーザーを発見します。このページでは、その発見メカニズムの詳細、特にBloom Filterの役割を説明します。

## Nostr Kind 25565イベント

polkaのユーザーは、自分の存在をNostrリレーに広告するため、Kind 25565のイベントを送信します。

### イベントの構造

```json
{
  "kind": 25565,
  "content": {
    "did": "did:web:alice.com",
    "bloom": "xxxx..."
  },
  "pubkey": "...",
  "created_at": xxx...,
  "sig": "..."
  other options...
}
```

**kind**
25565 は、polka用のカスタムイベントタイプです。

**content.did**
ユーザーのDID（Decentralized Identifier）です。`did:web:alice.com` のような形式です。

**content.bloom**
ユーザーが使っているタグのリストを、Bloom Filterでエンコードしたものです。base64形式で格納されています。

**sig**
Nostrの標準に従い、イベント全体にSchnorr署名が付けられています。

## Bloom Filterとは

Bloom Filterは、集合のメンバーシップを効率的にテストするための確率的データ構造です。

### Bloom Filterの特性

**偽陽性あり、偽陰性なし**
Bloom Filterは、「含まれていないのに含まれていると判定する」(偽陽性)ことがあります。しかし、「含まれているのに含まれていないと判定する」(偽陰性)ことはありません。

つまり、Bloom Filterで「マッチした」場合、実際には含まれていない可能性があります。しかし、「マッチしなかった」場合は、確実に含まれていません。

### polkaでのBloom Filterの役割

polkaでは、Bloom Filterを2つの目的で使用しています。

**効率的なマッチング**
クライアントは、受信したBloom Filterに対して、興味のあるタグが含まれているかを高速にチェックできます。

**プライバシー保護**
完全なタグのリストを公開せずに済みます。Bloom Filterからは、元のタグリストを完全に復元することはできません。
