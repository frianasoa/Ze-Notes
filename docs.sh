git checkout main
git fetch
git checkout v1 -- docs
git add docs
git commit -m "Updated docs for v1"
git push origin main
git checkout v1