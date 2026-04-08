# 糖蟹

糖蟹是一款帮助个人用户把任务自动排期并按时提醒的小程序产品。

## Workspace

This repository uses a pnpm workspace.

### Root scripts

- `pnpm install`
- `pnpm test`
- `pnpm run lint`
- `pnpm run build`

### Layout

- `apps/miniprogram` - WeChat mini program client
- `apps/admin` - AI provider/model/prompt admin console
- `apps/api` - backend API and scheduling service
- `packages/shared` - shared types and constants

## Environment

Copy `.env.example` to `.env` for local development and fill in the values for your environment.
