{
  description = "Open-Scorecard - PWA for tracking card game scores";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Node.js environment with dependencies
        nodeDependencies = (pkgs.callPackage ./default.nix {}).nodeDependencies;

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            nodePackages.node-gyp
            python3
          ];

          shellHook = ''
            echo "Open-Scorecard Development Environment"
            echo "======================================"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo ""
            echo "Available commands:"
            echo "  npm install      - Install dependencies"
            echo "  npm test         - Run tests in watch mode"
            echo "  npm run test:run - Run tests once"
            echo "  npm run test:ui  - Run tests with UI"
            echo "  npm run test:coverage - Run tests with coverage"
            echo ""

            # Set up node_modules if not present
            if [ ! -d "node_modules" ]; then
              echo "Installing dependencies..."
              npm install
            fi
          '';
        };

        # Optional: Build the package
        packages.default = pkgs.stdenv.mkDerivation {
          name = "open-scorecard";
          src = ./.;

          buildInputs = with pkgs; [
            nodejs_20
          ];

          buildPhase = ''
            # For static site, no build needed
            echo "Static PWA - no build step required"
          '';

          installPhase = ''
            mkdir -p $out
            cp -r * $out/
          '';
        };
      }
    );
}
