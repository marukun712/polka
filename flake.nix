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
          nativeBuildInputs = with pkgs; [
            pkg-config
            gobject-introspection
            cargo
            cargo-tauri
          ];
          buildInputs = [
            pkgs.at-spi2-atk
            pkgs.atkmm
            pkgs.cairo
            pkgs.gdk-pixbuf
            pkgs.glib
            pkgs.gtk3
            pkgs.harfbuzz
            pkgs.librsvg
            pkgs.libsoup_3
            pkgs.pango
            pkgs.webkitgtk_4_1
            pkgs.openssl
            pkgs.electron
            pkgs.nodejs_24
            pkgs.pnpm
            pkgs.bun
            pkgs.go
            pkgs.tinygo
            pkgs.wkg
            pkgs.wasm-tools
            pkgs.wit-bindgen
            rust
          ];
          shellHook = ''
            export ELECTRON_EXEC_PATH="${pkgs.electron}/bin/electron"
            export ELECTRON_SKIP_BINARY_DOWNLOAD="1"
          '';
        };
      }
    );
}
