# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Powered Project Manager that analyzes Slack conversations and proposes GitHub issues for untracked topics. Uses OpenAI GPT to extract important tasks from team discussions.

## Commands

```bash
yarn install          # Install dependencies
yarn start            # Run main analysis (same as yarn dev)
yarn lint             # ESLint check on src/
yarn format           # Prettier formatting

# Cache management - fetch and store data locally in data/
yarn slack:init       # Initial fetch of all Slack messages to cache
yarn slack:update     # Fetch only new messages since last cache
yarn slack:resume     # Resume interrupted fetch
yarn slack:export-md  # Export cached messages to Markdown

yarn github:init      # Initial fetch of all GitHub issues to cache
yarn github:update    # Fetch only new issues since last cache
```

## Architecture

Entry point: `src/index.ts` - CLI tool that orchestrates the workflow:
1. Fetches Slack messages (including threads) from configured channel
2. Fetches GitHub issues from configured repository
3. Sends both to OpenAI for analysis to find untracked topics
4. Interactively prompts user (y/n) for each proposal
5. Creates approved proposals as GitHub issues

### Services (`src/services/`)

- **slack.ts** - Slack Web API integration (message fetching, channel resolution, auto-join)
- **slackCache.ts** - Local JSON cache for Slack messages (`data/slack-{channelId}.json`)
- **github.ts** - Octokit-based GitHub API (issue fetching, creation)
- **githubCache.ts** - Local JSON cache for GitHub issues (`data/github-{owner}-{repo}.json`)
- **analyzer.ts** - OpenAI integration (builds prompt, parses JSON response into `IssueProposal[]`)
- **logger.ts** - Saves LLM input/output to `output/` as JSON and Markdown

### Commands (`src/commands/`)

CLI commands for cache management. Each command is a standalone script that can be run via yarn.

### Types (`src/types/index.ts`)

Key interfaces: `SlackMessage`, `IssueProposal`, `Config`, `DateRange`

## Data Storage

- `data/` - Local cache files (Slack messages, GitHub issues)
- `output/` - LLM analysis logs (JSON and Markdown format)

## Environment Variables

Required: `SLACK_BOT_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `OPENAI_API_KEY`
Plus either `SLACK_CHANNEL_NAME` or `SLACK_CHANNEL_ID`

Optional: `OPENAI_MODEL` (default: gpt-4o), `DATE_RANGE_DAYS` (default: 2), `LANGUAGE` (default: ja)
