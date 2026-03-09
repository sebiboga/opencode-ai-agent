# OpenCode AI Agent - peviitor_core

An AI-powered agent repository for the peviitor_core project, a Romanian job scraping platform. This repository uses OpenCode AI to execute tasks based on user prompts via GitHub Actions.

## Overview

This repository provides an AI agent that works with the peviitor_core data models for scraping and managing Romanian job listings. The agent can be triggered through GitHub Actions to perform various tasks related to job data processing.

## Project Structure

```
.
├── AGENTS.md                 # Agent-specific configurations and data model schemas
├── INSTRUCTIONS.md           # Usage instructions for running the agent
├── opencode.json             # OpenCode configuration (model, MCP servers)
├── .github/workflows/        # GitHub Actions workflows
│   └── opencode.yml          # Main workflow to run the OpenCode agent
└── .gitignore                # Git ignore rules
```

## Data Models

### Job Model

| Field          | Type     | Description |
|----------------|----------|-------------|
| url            | string   | Full URL to job detail page (unique, HTTP/HTTPS) |
| title          | string   | Position title (max 200 chars, diacritics accepted) |
| company        | string   | Hiring company legal name (uppercase, diacritics required) |
| cif            | string   | CIF/CUI of the company |
| location       | string[] | Romanian cities/addresses (diacritics accepted) |
| tags           | string[] | Skills/education/experience tags (lowercase, no diacritics) |
| workmode       | string   | "remote", "on-site", or "hybrid" |
| date           | date     | ISO8601 timestamp of scrape |
| status         | string   | Progress: scraped → tested → published → verified |
| vdate          | date     | Verified date (ISO8601) |
| expirationdate | date     | Estimated job expiration date |
| salary         | string   | Salary range + currency (e.g., "5000-8000 RON") |

### Company Model

| Field       | Type     | Description |
|-------------|----------|-------------|
| id          | string   | CIF/CUI (8 digits, no RO prefix) |
| company     | string   | Legal name from Trade Register (uppercase, diacritics required) |
| brand       | string   | Commercial brand name |
| group       | string   | Parent company group |
| status      | string   | "activ", "suspendat", "inactiv", or "radiat" |
| location    | string[] | Company locations |
| website     | string[] | Official website URLs |
| career      | string[] | Career page URLs |
| lastScraped | string   | Last scrape date (ISO8601) |
| scraperFile | string   | Name of scraper file used |

## Usage

1. Go to the **Actions** tab in GitHub
2. Select the **OpenCode AI Agent** workflow
3. Click **Run workflow**
4. Enter your prompt and run
5. The agent will execute the prompt and update `INSTRUCTIONS.md` and `AGENTS.md` with what it learned

## Configuration

The agent uses the following MCP (Model Context Protocol) servers:

- **chrome-devtools**: For web browsing and scraping
- **external-directory**: For file system operations

Model: `opencode/big-pickle`

## License

This project is part of the peviitor_core ecosystem.
