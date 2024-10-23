#!/bin/env bash
# Pulls audio if apache web server has files dated after latest `audio-$version` release tag.
#
# Ideally these files would be versioned in Git LFS and updated separately, but Github only allows
# a total of 1GB of LFS for free. Because of that, we'll make a Github release.
mkdir -p dist
cd dist

# Public Github runners have a disk limit of 14GB.
for v in souer; do
	LAST_RELEASE=$(gh release ls --json tagName,createdAt -q "map(select(.tagName | test(\"^audio-$v-.*\"))) | .[]")
	LAST_TAG=$(echo $LAST_RELEASE | jq ".tagName")
	LAST_RELEASE_DATE=$(echo $LAST_RELEASE | jq ".createdAt" | cut -d-10)

	set -e
	if deno task audio --since "$LAST_DOWNLOAD" $v; then
		# 0 = no compression (mp3 is already compressed, at most 1-2% gains from DEFLATE)
		# r = recursive
		# m = move into zipfile
		# s 1950m = split into 1950M since Github has a 2GB file limit
		zip -0rms 1950m $v.zip *
		ls
		VERSION=$(echo ${LAST_TAG:="audio-$v-v0.0.0"} | awk -F. -v OFS=. '{$NF += 1 ; print}')
		gh release create --latest=false --title "$v Audio" $TAG *
		rm -rf *
	else
		echo 'no changes'
	fi
done
