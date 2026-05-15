#!/bin/sh
set -e

mkdir -p /app/server/data /app/uploads

nginx

cd /app/server
exec node dist/index.js
