#!/bin/sh
# Публикация на GitHub Pages: собирает сайт и заливает dist в ветку gh-pages этого репозитория.
set -e
cd "$(dirname "$0")/.."
npm run build
# данные шифруются паролем из .site-password (или SITE_PASSWORD); без пароля публикация не идёт
node scripts/encrypt.mjs
URL=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R dist/. "$TMP"/ && touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git config user.name "$(git -C "$OLDPWD" config user.name)"
git config user.email "$(git -C "$OLDPWD" config user.email)"
git add -A && git commit -q -m "Publish site build"
git push -q -f "$URL" gh-pages
rm -rf "$TMP"
echo "Опубликовано. Сайт обновится через 1-2 минуты."
