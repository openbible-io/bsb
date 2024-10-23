#!/bin/env bash
# Pulls audio if apache web server has files dated after latest `audio-YYYY-mm-dd` release tag.
# If so, will create new release with ALL audio.
mkdir -p dist
cd dist

# Public Github runners have a disk limit of 14GB.
for v in souer; do
	TAG="audio-$v-$(date '+%Y-%m-%d')"
	LAST_DOWNLOAD=$(gh release view $TAG --json 'tagName' -q '.tagName' | grep -oP '\d{4}-\d{2}-\d{2}')
	set -e
	if deno task audio --since "$LAST_DOWNLOAD" $v; then
		# Github has a 2GB file limit
		zip -0rms 1950m $v.zip *
		gh release create --latest=false --title "$v Audio" $TAG *
		rm -rf *
	else
		echo 'no changes'
	fi
done
