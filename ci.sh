npm ci
if [[ "$GITHUB_EVENT_NAME" != "push" ]]; then
	./pull.sh
fi
node build.js

if [[ "$GITHUB_EVENT_NAME" == "push" ]]; then
	# Do a release
	git fetch --tags
	git tag
	# Manual tag, trust it does not need a bump.
	VERSION=$(git tag --points-at HEAD)
	if [[ -z $VERSION ]]; then
		# Last tagged version by date.
		VERSION=$(git tag --sort=committerdate | tail -1)
		echo "No manual tag, bumping $VERSION"
		VERSION=$(echo ${VERSION:=v0.0.0} | awk -F. -v OFS=. '{$NF += 1 ; print}')
		git tag $VERSION
		git push --tags origin master
	fi
	npm version --no-git-tag-version $VERSION
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
