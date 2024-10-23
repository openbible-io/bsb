#!/bin/env bash
# Pulls text to `bsb` dir.
set -e

curl https://bereanbible.com/bsb_tables.xlsx > bsb/bsb_tables.xlsx
curl https://bereanbible.com/bsb_usfm.zip > bsb_usfm.zip
7z x -aoa bsb_usfm.zip -obsb
rm bsb_usfm.zip
