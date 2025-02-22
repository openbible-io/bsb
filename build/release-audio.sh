#!/usr/bin/env bash
# Releases audio if upstream apache web server has files dated after latest
# `audio-$version` Github release.
#
# Ideally these files would be versioned in Git, but Github only allows a
# total of 1GB of LFS for free. Because of that, we'll use Github releases.
#
# Public Github runners have a disk limit of 14GB, so we release each version
# separately in case we want to batch download the MP3s before batch
# converting to WEBM.
mkdir -p dist
cd dist

v=$1

LAST_RELEASE=$(gh release ls --json tagName,createdAt -q "map(select(.tagName | test(\"^audio-$v-.*\"))) | .[]")
LAST_TAG=$(echo $LAST_RELEASE | jq -r ".tagName")
LAST_RELEASE_DATE=$(echo $LAST_RELEASE | jq -r ".createdAt" | cut -c-10)
if [ "$2" = 'true' ]; then
	echo "forcing redownload"
	LAST_RELEASE_DATE=""
fi

set -e
if deno task audio --since "$LAST_RELEASE_DATE" $v; then
	# bitrate https://wiki.xiph.org/Opus_Recommended_Settings
	find . -name '*.mp3' | parallel --eta --bar ffmpeg \
		-hide_banner -loglevel warning \
		-y -i {} \
		-map_metadata -1 \
		-b:a 32k \
		{.}.webm
	find . -name '*.mp3' -exec rm {} \;
	# 0 = no compression (webm is already compressed, at most 1-2% less size)
	# r = recursive
	# m = move into zipfile
	# s 1950m = split into 1950M since Github has a 2GB file limit
	zip -0rms 1950m $v.zip *
	ls -lah
	TAG=$(echo ${LAST_TAG:="audio-$v-v0.0.0"} | awk -F. -v OFS=. '{$NF += 1 ; print}')
	gh release create --latest=false --title "$v audio" $TAG *
	rm -rf *
else
	echo 'no changes'
fi
