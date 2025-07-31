#!/bin/bash

# 스크립트 실행 중 오류 발생 시 즉시 종료
set -e

echo "--- 1. gpx 프로젝트 빌드 ---"
npm install # 의존성 설치 (package.json 변경 시 필요)
npm run build # gpx 프로젝트 빌드

echo "--- 2. gpx 로컬 바이너리 경로 설정 ---"
# package.json의 bin 필드에 정의된 gpx 바이너리 경로
GPX_LOCAL_BIN="./dist/cli.js"

# 빌드된 바이너리가 존재하는지 확인
if [ ! -f "$GPX_LOCAL_BIN" ]; then
  echo "Error: gpx local binary not found at $GPX_LOCAL_BIN"
  exit 1
fi

echo "--- 3. zoxide 릴리스 다운로드 및 실행 시도 (verbose 모드) ---"
npm cache clean --force || true # npm 캐시 정리
rm -rf "${HOME}/.cache/gpx" || true # gpx 캐시 정리
# npx를 사용하여 로컬 gpx 바이너리 실행
# --verbose 옵션으로 상세 로그 출력
# 2>&1 | tee gpx_output.log: 표준 출력과 표준 에러를 모두 화면에 출력하고 파일에도 저장
# npx를 사용하여 현재 디렉토리의 package.json에 정의된 gpx 바이너리 실행
npx --package . gpx ajeetdsouza/zoxide --verbose 2>&1 | tee gpx_output.log

echo "--- 4. 캐시된 zoxide 바이너리 경로 확인 ---"
# gpx의 캐시 디렉토리는 OS에 따라 다를 수 있음
# macOS: ~/Library/Caches/gpx
# Linux: ~/.cache/gpx
# Windows: %LOCALAPPDATA%\gpx
# 여기서는 macOS/Linux 기준으로 가정
GPX_CACHE_DIR="${HOME}/.cache/gpx/ajeetdsouza/zoxide/v0.9.8/$(node -p 'process.platform')-$(node -p 'process.arch')"
ZOXIDE_BIN_PATH="${GPX_CACHE_DIR}/zoxide" # zoxide 바이너리 이름은 'zoxide'로 가정

echo "캐시된 zoxide 바이너리 예상 경로: $ZOXIDE_BIN_PATH"

if [ -f "$ZOXIDE_BIN_PATH" ]; then
  echo "--- 5. 캐시된 zoxide 바이너리 권한 및 형식 확인 ---"
  ls -l "$ZOXIDE_BIN_PATH"
  file "$ZOXIDE_BIN_PATH"

  echo "--- 6. 캐시된 zoxide 바이너리 직접 실행 시도 ---"
  # 실행 권한이 없다면 부여
  chmod +x "$ZOXIDE_BIN_PATH" || true # 오류 발생해도 스크립트 중단하지 않음
  "$ZOXIDE_BIN_PATH" --version || echo "Error: Failed to run zoxide directly."
else
  echo "Error: Cached zoxide binary not found at $ZOXIDE_BIN_PATH. Check gpx_output.log for details."
fi

echo "--- 스크립트 완료 ---"
echo "자세한 로그는 gpx_output.log 파일을 확인하세요."
