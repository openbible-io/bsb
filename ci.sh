npm ci
if [[ "$GITHUB_EVENT_NAME" != "push" ]]; then
	./pull.sh
fi
node build.js

patch() {
	npm version patch
	if [[ "$CI" == "true" ]]; then
		git push --tags origin master
		npm publish --provenance --access public
	fi
}

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
