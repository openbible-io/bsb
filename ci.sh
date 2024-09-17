npm ci
if [[ $1 == "--pull" ]]; then
	./pull.sh
fi
node build.js

patch() {
	npm version patch
	git push --tags origin master
	npm publish --provenance --access public
}

git config user.name ci
git config user.email ci@openbible.io
if [[ $1 == "--pull" ]]; then
	git status -s
	if [[ -n "$(git status -s)" ]]; then
		git add .
		git commit -m  "Pull new version"
		patch
	fi
else
	patch
fi
