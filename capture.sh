#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export SESSION="capture-$$"
/usr/bin/time -p echo "capture session: $SESSION"
/usr/bin/time -p bash -c 'if [ -z "${CAPTURE_URL:-}" ]; then echo "CAPTURE_URL is required" >&2; exit 1; fi'
/usr/bin/time -p bash -c 'if [ -z "${CAPTURE_DIR:-}" ]; then echo "CAPTURE_DIR is required" >&2; exit 1; fi'
/usr/bin/time -p bash -c 'case "$CAPTURE_URL" in http://*|https://*) ;; *) echo "CAPTURE_URL must start with http:// or https://" >&2; exit 1;; esac'
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p bash -c 'command -v playwright-cli >/dev/null || { echo "playwright-cli not found" >&2; exit 1; }'
/usr/bin/time -p bash -c 'command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }'

cleanup() {
  /usr/bin/time -p playwright-cli -s="$SESSION" close 2>/dev/null || true
}
trap cleanup EXIT

HTTP_CODE="$(/usr/bin/time -p curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' "$CAPTURE_URL" || echo "000")"
export HTTP_CODE
/usr/bin/time -p echo "HTTP $HTTP_CODE for $CAPTURE_URL"
/usr/bin/time -p bash -c 'code="$HTTP_CODE"; case "$code" in 2*) exit 0;; 408|429|5*|000) echo "transient HTTP $code" >&2; exit 75;; 4*) echo "permanent HTTP $code" >&2; exit 1;; *) echo "unexpected HTTP $code" >&2; exit 1;; esac'

if ! /usr/bin/time -p playwright-cli -s="$SESSION" open "$CAPTURE_URL"; then
  echo "browser open failed (transient)" >&2
  exit 75
fi
/usr/bin/time -p sleep 3
if ! /usr/bin/time -p playwright-cli -s="$SESSION" eval "(async () => { await document.fonts.ready.catch(()=>{}); return document.fonts.status; })()"; then
  echo "font wait failed, continuing" >&2
fi
BODY_RAW="$(/usr/bin/time -p playwright-cli -s="$SESSION" eval "document.body ? document.body.innerText.length : 0" 2>&1 || echo "eval-fail")"
BODY_LEN="$(echo "$BODY_RAW" | /usr/bin/time -p awk '/### Result/{getline; gsub(/[^0-9]/,""); print; exit}')"
/usr/bin/time -p echo "body raw lines: $(echo "$BODY_RAW" | wc -l)"
export BODY_LEN
/usr/bin/time -p echo "body text length: $BODY_LEN"
/usr/bin/time -p bash -c 'if [ -z "${BODY_LEN:-}" ] || [ "$BODY_LEN" = "eval-fail" ]; then echo "browser eval failed (transient)" >&2; exit 75; fi; if ! printf "%s" "$BODY_LEN" | grep -qE "^[0-9]+$"; then echo "body length not numeric: $BODY_LEN (transient)" >&2; exit 75; fi; if [ "$BODY_LEN" -lt 10 ]; then echo "empty render len=$BODY_LEN (defect)" >&2; exit 1; fi'

if ! /usr/bin/time -p playwright-cli -s="$SESSION" resize 1440 900; then
  echo "desktop resize failed (transient)" >&2
  exit 75
fi
/usr/bin/time -p sleep 1
if ! /usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename "$CAPTURE_DIR/final-desktop.png"; then
  echo "desktop screenshot failed (transient)" >&2
  exit 75
fi
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p bash -c 'if [ ! -s "$CAPTURE_DIR/final-desktop.png" ]; then echo "desktop png missing/empty (defect)" >&2; exit 1; fi'

if ! /usr/bin/time -p playwright-cli -s="$SESSION" resize 390 844; then
  echo "mobile resize failed (transient)" >&2
  exit 75
fi
/usr/bin/time -p sleep 1
if ! /usr/bin/time -p playwright-cli -s="$SESSION" screenshot --filename "$CAPTURE_DIR/final-mobile.png"; then
  echo "mobile screenshot failed (transient)" >&2
  exit 75
fi
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png"
/usr/bin/time -p bash -c 'if [ ! -s "$CAPTURE_DIR/final-mobile.png" ]; then echo "mobile png missing/empty (defect)" >&2; exit 1; fi'

/usr/bin/time -p ls -lh "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"
/usr/bin/time -p echo "capture ok, leaving app running"
/usr/bin/time -p playwright-cli -s="$SESSION" close
trap - EXIT
