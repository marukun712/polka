# セルフホストガイド

# didの用意

polkaでは、did:webという技術を使って、あなたのドメインを公開鍵のハンドルとすることができます。

DIDとは、Decentralized Identifierの略で、ユーザーが自分のアイデンティティを任意の場所に置くことができる仕組みです。

たとえば、`did:web:example.com`のユーザーの公開鍵は、DID Documentと呼ばれるJSONに紐づけられます。

そのDID Documentは`https://example.com/.well-known/did.json`でアクセス可能である必要があります。

通常、DID Documentは、W3Cの仕様に従って記述する必要がありますが、polka CLIでは、DID Documentの自動生成をサポートします。

まず、polkaを日常的に使用するクライアント端末に、polka CLIをインストールします。

polka CLIはクレデンシャルをOS Keyringに保存するため、デスクトップ環境がない場合動作しないことがあります。

```
git clone https://github.com/marukun712/polka
cd polka/cli
bun i
```

CLIを起動します。
```
bun run setup
```

すると、polkaで使用したいあなたのドメインが尋ねられます。

ドメインを入力すると、DID Documentと鍵ペアが生成されます。

この鍵はあなたのアイデンティティそのものになります。絶対に漏洩しないように、厳重に保管してください。

秘密鍵を保存したら、DID Documentを.well-known/did.jsonにアップロードします。

ここからは、自分のデータをホスティングするサーバー側での操作になります。

ここではCaddy + NixOSのサーバーを例にとってご紹介しますが、実際の操作は単なる静的ファイルのホスティングです。

GitHub PagesやNetlifyなどでも同様に動作するので、適宜読み替えてください。

まず、
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

Caddyを有効にします。
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

ビルドが完了したらブラウザで
```
https://${domain}/.well-known/did.json
```
にアクセスして、DID Documentが返ってくることを確認します。

これで、DIDのセットアップが完了しました。クライアント端末に戻ります。

クライアント側のpolka CLIでEnterをクリックし、didが解決されていることを確認します。

# Git Remoteの用意
次に、リポジトリを管理するためのGit Remoteを設定します。
先ほどCaddyをホストしたサーバー側にもどり、今回はGiteaを例にご紹介します。

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

# Actionsの設定

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

# クライアントの初期化

自動的にCommitしたファイルが公開されるGit Remoteができたので、クライアントにRemoteのURLを登録します。

CLIでDIDの解決が完了すると、Git RemoteのSSH URLの入力を求められるので、入力します。

すると、~/.polka/repoに対象のリポジトリがクローンされ、そこにpolka DBが初期化されます。

初期化が完了したら、ユーザー情報の入力を求められます。

- name
- description
- icon URL

これらの情報を入力すると、その情報がpolka DBに書き込まれ、セットアップスクリプトが完了します。

# デスクトップアプリ

ここまでの手順で、あなたの端末でpolka DBに書き込み、サーバーにPushして公開をする一連の流れが完成しました。

デスクトップアプリをセットアップして、polka Viewを利用しましょう！

デスクトップアプリはElectron製です。まず、インストールしてビルドします。

```
cd ./desktop
bun i
bun run build
```

実行します。
```
bun run start
```

すると、ドメインの入力フォームが開くので、セットアップしたドメインを入力します。
`example.com`のような形で入力してください。

Submitすると、あなたのプロフィール画面が表示されます。これにて、polkaのセットアップは完了です！
