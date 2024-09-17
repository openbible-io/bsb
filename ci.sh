npm ci
if [[ "$GITHUB_EVENT_NAME" != "push" ]]; then
	./pull.sh
fi
node build.js

if [[ "$GITHUB_EVENT_NAME" == "push" ]]; then
	# Do a release
	git tag
	BUMPED=$(git describe --tags --abbrev=0 | awk -F. -v OFS=. '{$NF += 1 ; print}')
	git tag $BUMPED
	git push --tags origin master
	npm version --no-git-tag-version $BUMPED
	npm publish --provenance --access public
else
	# Push an update for later review + release.
	git status -s
	if [[ -n "$(git status -s)" ]]; then
		git add .
		git config user.name ci
		git config user.email ci@openbible.io
		git commit -m  "Pull new version"
		git push
	fi
fi
