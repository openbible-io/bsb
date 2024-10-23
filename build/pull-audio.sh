#!/bin/env bash
# Pulls audio to `dist` dir.
deno -A ./src/audio.ts souer
cd dist
7z a -v950m -m0=Copy souer.zip *
