# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Powered Project Manager that analyzes Slack conversations and proposes GitHub issues for untracked topics. Uses OpenAI GPT to extract important tasks from team discussions.

## Commands

```bash
yarn install     # Install dependencies
yarn start       # Run the tool (same as yarn dev)
yarn lint        # ESLint check on src/
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
- **github.ts** - Octokit-based GitHub API (issue fetching, creation)
- **analyzer.ts** - OpenAI integration (builds prompt, parses JSON response into `IssueProposal[]`)
- **logger.ts** - Saves LLM input/output to `output/` as JSON and Markdown

### Types (`src/types/index.ts`)

Key interfaces: `SlackMessage`, `IssueProposal`, `Config`, `DateRange`

## Environment Variables

Required: `SLACK_BOT_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `OPENAI_API_KEY`
Plus either `SLACK_CHANNEL_NAME` or `SLACK_CHANNEL_ID`

Optional: `OPENAI_MODEL` (default: gpt-4o), `DATE_RANGE_DAYS` (default: 2), `LANGUAGE` (default: ja)
