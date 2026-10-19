#!/bin/sh
# Installs the coss.com CLI (`coss`) from its GitHub release, checking the archive against the
# release's SHA256SUMS:
#
#   curl -fsSL https://raw.githubusercontent.com/cosscom/coss/main/packages/cli/install.sh | sh
#
# COSS_VERSION       a version (default: the newest coss-cli release)
# COSS_INSTALL_DIR   where `coss` goes (default: ~/.local/bin)
# COSS_RELEASES_URL  where releases are downloaded from (default: GitHub's)
set -eu

repo="cosscom/coss"
releases="${COSS_RELEASES_URL:-https://github.com/$repo/releases/download}"
dir="${COSS_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
  echo "coss: $*" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is needed."
command -v tar >/dev/null 2>&1 || fail "tar is needed."

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) fail "no binary for $(uname -s): install with npm instead (npm install -g coss-cli)." ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) fail "no binary for $(uname -m): install with npm instead (npm install -g coss-cli)." ;;
esac
target="$os-$arch"
# Alpine and other musl systems.
if [ "$os" = linux ] && { ls /lib/ld-musl-* >/dev/null 2>&1 || ldd --version 2>&1 | grep -qi musl; }; then
  target="$target-musl"
fi

version="${COSS_VERSION:-}"
if [ -z "$version" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/$repo/releases?per_page=100" |
    grep -o '"tag_name": *"coss-cli@[^"]*"' | head -n 1 | sed 's/.*coss-cli@\([^"]*\)"/\1/')" ||
    true
  [ -n "$version" ] || fail "couldn't find the newest release; set COSS_VERSION."
fi

archive="coss-cli-$version-$target.tar.gz"
base="$releases/coss-cli%40$version"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "Downloading coss $version ($target)…" >&2
curl -fsSL -o "$tmp/$archive" "$base/$archive" || fail "couldn't download $base/$archive."
curl -fsSL -o "$tmp/SHA256SUMS" "$base/SHA256SUMS" || fail "couldn't download $base/SHA256SUMS."

expected="$(grep "  $archive\$" "$tmp/SHA256SUMS" | cut -d ' ' -f 1)"
[ -n "$expected" ] || fail "SHA256SUMS doesn't list $archive."
if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$tmp/$archive" | cut -d ' ' -f 1)"
elif command -v shasum >/dev/null 2>&1; then
  actual="$(shasum -a 256 "$tmp/$archive" | cut -d ' ' -f 1)"
else
  fail "sha256sum or shasum is needed to check the download."
fi
[ "$actual" = "$expected" ] || fail "$archive doesn't match its checksum: not installing it."

tar -xzf "$tmp/$archive" -C "$tmp" coss
mkdir -p "$dir"
mv "$tmp/coss" "$dir/coss"
chmod 755 "$dir/coss"
if ! "$dir/coss" --version >/dev/null 2>&1; then
  case "$target" in
    *-musl) fail "installed $dir/coss, but it needs libstdc++ (on Alpine: apk add libstdc++)." ;;
    *) fail "installed $dir/coss, but it doesn't run on this machine." ;;
  esac
fi
echo "Installed coss $version to $dir/coss." >&2
case ":$PATH:" in
  *":$dir:"*) ;;
  *) echo "Add $dir to your PATH to run it as \`coss\`." >&2 ;;
esac
echo "Next: coss login" >&2
