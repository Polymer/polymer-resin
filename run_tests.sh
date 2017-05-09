#!/bin/bash

# A web-component-tester wrapper that does the plumbing necessary to get
# tests running.

set -e

# Test the context we're running in.
pushd "$(dirname "$0")"
export SRC_DIR="$PWD"
popd

echo SRC_DIR=$SRC_DIR
[ -d "$SRC_DIR" ]
[ -f "$SRC_DIR/polymer-resin.js" ]

export TEST_ROOT_DIR="$(mktemp -d "$TMPDIR"/wct_root.XXXXXXXXXX)"
[ -d "$TEST_ROOT_DIR" ]


function copy_over() {
  local D="$1"
  local F="$2"

  # Hard links make it possible to edit the file in the
  # main directory and reload when running via
  # $ run_tests -p -l chrome
  mkdir -p "$(dirname "$TEST_ROOT_DIR"/"$D"/"$F")" \
    && ln "$F" "$TEST_ROOT_DIR"/"$D"/"$F"
}

pushd "$SRC_DIR"

for f in *test.{html,js}
do
  copy_over polymer-resin "$f"
done

# Generate a test/tests.html for wct to find that
# serves as a master test suite.
export TEST_SUITE_HTML="$TEST_ROOT_DIR"/polymer-resin/test/tests.html
mkdir -p "$(dirname "$TEST_SUITE_HTML")"
echo '
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="/components/webcomponentsjs/webcomponents-lite.js"></script>
    <script src="/components/web-component-tester/browser.js"></script>
  </head>
  <body>
    <script>
      WCT.loadSuites([' \
        > "$TEST_SUITE_HTML"

for f in *test.html; do
  echo "          '../$f'," >> "$TEST_SUITE_HTML"
done

echo '
      ]);
    </script>
  </body>
</html>' \
  >> "$TEST_SUITE_HTML"


popd


# For dependencies we just copy the components over.
cp -r "$SRC_DIR"/bower_components/webcomponentsjs \
  "$TEST_ROOT_DIR"/webcomponentsjs
cp -r "$SRC_DIR"/bower_components/polymer \
  "$TEST_ROOT_DIR"/polymer


# TODO: allow running the tests against both debug and non-debug
# versions.
ln "$SRC_DIR"/standalone/polymer-resin-debug.js \
  "$TEST_ROOT_DIR"/polymer-resin/polymer-resin.js


# Invoke wct
pushd "$TEST_ROOT_DIR/polymer-resin"

export FAILED=""
"$SRC_DIR"/node_modules/.bin/wct "$@" || export FAILED="1"

popd


rm -rf "$TEST_ROOT_DIR"
[ -z "$FAILED" ]
