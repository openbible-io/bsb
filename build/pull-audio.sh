#!/bin/env bash
# Releases audio if apache web server has files dated after latest
# `audio-YYYY-mm-dd` Github release tag.

LAST_DOWNLOAD=$(gh release view --json 'tagName' -q '.tagName' | cut -c7-)
for v in souer gilbert hays; do
	deno task audio $v --since "$LAST_DOWNLOAD"
	if [ -d dist ]; then
		pushd dist
		# Github has a 2GB file limit
		zip -0rms 1950m $v.zip *
		popd
	fi
done

