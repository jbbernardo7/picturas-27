#!/usr/bin/env bash
# Generates the small test videos used by the e2e tests (needs ffmpeg with
# libx264, libx265 and libvpx). The generated files are committed, so this
# only needs to run again if a fixture changes.
set -euo pipefail
cd "$(dirname "$0")/fixtures"
FF="ffmpeg -hide_banner -loglevel error -y"
SRC="-f lavfi -i testsrc=duration=12:size=320x240:rate=25"
AUD="-f lavfi -i sine=frequency=440:duration=12"

$FF $SRC $AUD -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest clip_h264.mp4
$FF $SRC $AUD -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest clip_h264.mov
$FF $SRC $AUD -c:v libvpx-vp9 -b:v 300k -c:a libopus -shortest clip_vp9.webm
$FF $SRC $AUD -c:v libvpx -b:v 300k -c:a libvorbis -shortest clip_vp8.webm
$FF -f lavfi -i testsrc=duration=4:size=320x240:rate=25 -c:v libx265 -x265-params log-level=error -pix_fmt yuv420p clip_hevc.mp4
# 10 min 01 s, 1 frame per second at tiny size: over the duration limit, few KB
$FF -f lavfi -i color=c=gray:size=64x64:rate=1:duration=601 -c:v libx264 -pix_fmt yuv420p long_601s.mp4
# a text file with a video extension (content check)
echo "this is not a video" > fake.mp4
$FF -f lavfi -i testsrc=size=64x64 -frames:v 1 photo.png
ls -la
