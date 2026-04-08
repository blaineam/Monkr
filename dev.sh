#!/bin/bash
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")"
exec npx vite dev --port 5173
