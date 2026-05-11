#!/bin/bash

echo "开始同步 Codex 代码到外接硬盘项目..."

rsync -av "/Users/jinnianfadacai/Documents/Codex/2026-05-09/web-mvp-next-js-typescript-tailwind/src/" "/Volumes/阿冻发财啦/BeadProject/bead-pattern-web/src/"

echo "同步完成。"
