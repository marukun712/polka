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
          buildInputs = [
            pkgs.bun
            pkgs.mdbook
            pkgs.electron
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
