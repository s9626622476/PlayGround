#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export PROJECT_DIR_SCRIPT="$(pwd)"
export PORT="${PORT:-3000}"
export DIST_DIR="$PROJECT_DIR_SCRIPT/dist"
export WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
/usr/bin/time -p echo "project dir: $PROJECT_DIR_SCRIPT"
/usr/bin/time -p echo "PORT=$PORT"
/usr/bin/time -p python3 --version
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p test -f "$DIST_DIR/index.html"
/usr/bin/time -p bash -c 'if [ -f app/build/outputs/apk/debug/app-debug.apk ]; then cp -f app/build/outputs/apk/debug/app-debug.apk dist/app-debug.apk; echo "apk copied to dist"; else echo "no local apk yet, serving landing page only"; fi'
/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p python3 -c "import json,os,pathlib; project=os.path.realpath(os.environ.get('PROJECT_DIR_SCRIPT','.')); dist=os.path.realpath(os.path.join(project,'dist')); web=os.environ.get('OPENCODE_WEB_DIR','/home/runner/work/_temp/omgithub-web'); pathlib.Path(web).mkdir(parents=True,exist_ok=True); payload={'project':project,'directory':dist}; open(os.path.join(web,'deployment-output.json'),'w').write(json.dumps(payload)); print(open(os.path.join(web,'deployment-output.json')).read())"
/usr/bin/time -p cat "$WEB_DIR/deployment-output.json"
/usr/bin/time -p echo "serving $DIST_DIR on 0.0.0.0:$PORT foreground"
/usr/bin/time -p python3 -m http.server "$PORT" --directory "$DIST_DIR" --bind 0.0.0.0
