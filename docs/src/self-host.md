# セルフホストガイド

polkaをセルフホストする手順。ファイルを管理するためのGit RemoteやWebサーバー含めて、すべてセルフホストする方法を説明します。

## 環境
NixOS 25.05

## Setup
polkaをセルフホストするためには、ファイルを公開するWebサーバーなどが必要です。
また、投稿の世代管理などを行うため、Gitのようなバージョン管理ツールを使用することを強く推奨しています。

このガイドでは、Git、Webサーバー、Actionsなどすべての要素をセルフホストする例です。
これらの手順はGitHub、GitHub Pagesのようなプラットフォームでも同じように動作します。適宜読み替えてください。

## didの用意
polkaでは、did:webという技術を使って、あなたのドメインをidとすることができます。

DIDとは、Decentralized Identifierの略で、ユーザーが自分のアイデンティティを任意の場所に置くことができる仕組みです。

DIDは
```
did:method:pointer
```
という構造になっており、pointerの値を使ってmethodごとの方法で、DID Documentというあなたを表すJSONドキュメントをresolveします。

did:webでは
```
did:web:example.com
```
という構造になっており、DID Documentは`https://example.com/.well-known/did.json`でアクセス可能である必要があります。

polka CLIでは、DID Documentの生成をサポートします。

まず、polka CLIをセットアップします。
```
git clone https://github.com/marukun712/polka

nix develop
cd polka/cli
bun i
```

CLIを起動します。
```
bun run setup
```

すると、polkaで使用したいあなたのドメインが尋ねられます。
このドメインはあなたを表すidとなるため、慎重に選択しましょう。

ドメインを入力すると、DID Documentと鍵ペアが生成されます。この鍵ペアはあなたのデータリポジトリ全体を署名するための鍵となるため、漏洩するとアカウントが乗っ取られてしまいます。パスワードと異なり、回復することもできません。厳重に保管しましょう。

デフォルトではOSのKeyringに保存されています。
OSごとのパスワード管理アプリなどからご確認ください。

秘密鍵を保存したら、DID Documentを.well-known/did.jsonにアップロードします。

`/var/www/polka`を作成します。
```
sudo mkdir /var/www/polka
```

`.well-known/did.json`を作成します。
```
sudo mkdir /var/www/polka/.well-known
sudo nano /var/www/polka/.well-known/did.json
```
先ほど表示されたDID Documentをコピーします。

リポジトリファイル保存用のフォルダも作成します。
```
sudo mkdir /var/www/polka/polka
```

次に、Caddyを有効にします。
`configuration.nix`に以下を記述します。
```
services.caddy = {
  enable = true;
  virtualHosts.":9000".extraConfig = ''
    header Access-Control-Allow-Origin *
    handle /.well-known/* {
      root * /var/www/polka
      file_server
    }
    handle /polka/* {
      root * /var/www/polka
      file_server
    }
    handle {
      respond "This is polka server."
    }
  '';
};
```

リビルドします。
```
sudo nixos-rebuild switch --flake .#{flake-name}
```

ブラウザで、
```
https://${domain}/.well-known/did.json
```
にアクセスして、DID Documentが返ってくることを確認します。

確認出来たら、CLIフォルダに.envを作成し、
```
POLKA_DOMAIN=
```
環境変数`POLKA_DOMAIN`にドメインを入力します。

## Git Remoteの用意
次に、リポジトリを管理するためのGit Remoteを設定します。
このガイドでは、Giteaをセルフホストします。

`configuration.nix`に以下を記述します。
```
services.gitea = {
  enable = true;
  package = pkgs.gitea;
  stateDir = "/var/lib/gitea";
  settings.server = {
    DISABLE_SSH = false;
    START_SSH_SERVER = true;
    SSH_LISTEN_PORT = 2222;
    SSH_PORT = 2222;
  };
};
```

リビルドします。
```
sudo nixos-rebuild switch --flake .#{flake-name}
```

`localhost:3000`にアクセスし、Giteaのセットアップを済ませて、SSH経由で接続できるようにしてください。

セットアップを済ませたら、リポジトリを作成します。

`POLKA_MAIN_REMOTE`環境変数を、以下のように設定します。
```
POLKA_MAIN_REMOTE=ssh://gitea@{ip}:2222/{user}/{repo-name}
```

## Actionsの設定
次に、リポジトリへのpush時に自動的に`/var/www/polka/polka`にリポジトリファイルがコピーされるように設定します。

Giteaの設定から、Actionsトークンを取得し、保存します。
```
printf "TOKEN=Your Token" | sudo tee /etc/gitea-runner-token > /dev/null
```

`configuration.nix`に以下を記述します。
```
services.gitea-actions-runner = {
  package = pkgs.gitea-actions-runner;
  instances.default = {
    enable = true;
    name = "runner";
    url = "http://localhost:3000";
    tokenFile = "/etc/gitea-runner-token";
    labels = [ "native:host" ];
  };
};
systemd.services.gitea-runner-default.serviceConfig.ReadWritePaths = [ "/var/www/polka" ];
```

GiteaのAction設定からランナーが見えたら、リポジトリに`.gitea/workflows/deploy.yaml`
を作成し、以下を記述します

```
name: Deploy Files
on: [push]

jobs:
  deploy:
    runs-on: native
    steps:
      - name: Check out code
        uses: actions/checkout@v3
      - name: Copy files
        run: |
          echo "Deploying..."
          rm -rf /var/www/polka/polka/dist/
          cp -r polka/dist/ /var/www/polka/polka/
          echo "Done!"
```

runnerがディレクトリに書き込めるようにします。
```
sudo chown -R gitea-runner:gitea-runner /var/www/polka
```

これで、push時に自動的にCaddyでリポジトリファイルが公開されます。

## ユーザー情報の入力
CLIを起動します。
```
bun run setup
```

ユーザー情報の入力を求められます。これらは必須となっているので、入力しましょう。
- name
- description
- iconのURL

## デスクトップアプリの起動
次に、デスクトップアプリから投稿をしてみましょう。

アプリをセットアップします。
```
cd desktop
bun i
bun run build
bun run start
```

すると、デスクトップアプリが起動します。
入力フォームで使用しているドメインを尋ねられるので、セットアップ時に入力したものと同じドメインを入力してください。

自分のプロフィールが表示されたらセットアップは完了です！
