{
  description = "Shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };
        rust = pkgs.rust-bin.stable.latest.default.override {
          extensions = [
            "rust-src"
            "rustfmt"
          ];
          targets = [ "wasm32-wasip2" ];
        };
      in
      {
        devShell = pkgs.mkShell {
          pure = false;
          buildInputs = [
            pkgs.pkg-config
            pkgs.openssl
            pkgs.nodejs_24
            pkgs.pnpm
            pkgs.bun
            pkgs.go
            pkgs.wkg
            pkgs.wasm-tools
            pkgs.wit-bindgen
            pkgs.prisma-engines
            pkgs.prisma
            pkgs.electron
            pkgs.glib
            pkgs.glib.dev
            pkgs.libsecret
            pkgs.libsecret.dev
            pkgs.gnome-keyring
            rust
          ];
          shellHook = ''
            export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:${pkgs.libsecret.dev}/lib/pkgconfig:${pkgs.glib.out}/lib/pkgconfig"
            export LD_LIBRARY_PATH="${pkgs.libsecret.out}/lib:${pkgs.glib.out}/lib:$LD_LIBRARY_PATH"

            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
            export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"

            export ELECTRON_EXEC_PATH="${pkgs.electron}/bin/electron"
            export ELECTRON_SKIP_BINARY_DOWNLOAD="1"
          '';
        };
      }
    );
}
