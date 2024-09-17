patch() {
	BUMPED=$(git describe --tags --abbrev=0 | awk -F. -v OFS=. '{$NF += 1 ; print}')
	git tag $BUMPED
	git push --tags origin master
	npm version --no-git-tag-version $BUMPED
	npm publish --provenance --access public
}

npm ci
if [[ "$GITHUB_EVENT_NAME" != "push" ]]; then
	./pull.sh
fi
node build.js

git config user.name ci
git config user.email ci@openbible.io
if [[ "$GITHUB_EVENT_NAME" != "push" ]]; then
	git status -s
	if [[ -n "$(git status -s)" ]]; then
		git add .
		git commit -m  "Pull new version"
		patch
	fi
else
	patch
fi
