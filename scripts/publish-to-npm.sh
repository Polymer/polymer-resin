#!/bin/bash

set -e

[ -n "${TMPDIR}" ]
[ -d "${TMPDIR}" ]

# Repack, and check the contents
export TARBALL="$(npm pack 2> /dev/null | tail -1)"

echo PACKAGE CONTENTS:
tar tfz "${TARBALL}"

read -p 'Does the package contents look ok? (yes|no) ' PACKED_OK

echo "${PACKED_OK}" | egrep -qi '^y'


if false; then
    export PROJECT_NAME=$(node -e 'console.log(require("./package.json").name)')
    export TMP_WORKSPACE="${TMPDIR}"/"${PROJECT_NAME}"-test-workspace
    # TODO: Test that it installs and that tests run green in isolation
    # by copying test files to a TMP_WORKSPACE, unpacking the tarball,
    # and running tests.
    # TODO: For this, we really need to reorganize all test files to live
    # under test.
fi

rm "${TARBALL}"


echo '
1. Figure out what kind of release it is:
*  patch
*  minor
*  major

Assuming it is in `${NPM_VERSION_BUMP}`:
$ npm version "${NPM_VERSION_BUMP}"


2. Get a 2FA nonce from the Google Authenticator app.
Assuming it is in `${OTP}`:
$ npm publish --otp "${OTP}"


3. Push the release label to GitHub.
$ git push --tags origin master
'
