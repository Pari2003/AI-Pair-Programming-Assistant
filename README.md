# AI Pair Programming Assistant (VS Code Extension)

An intelligent, highly autonomous VS Code extension that orchestrates an agentic "Write → Refactor → Test" loop, featuring autonomous self-review, workspace context awareness, terminal execution, and semantic auto-commits.

## Motivation
Most AI coding assistants act as passive autocomplete or basic chat interfaces. This project aims to build an **autonomous software engineer agent** (inspired by state-of-the-art tools like Devin, Cursor, and Aider) that integrates deeply into your IDE workflow. Instead of just generating code snippets, it autonomously plans, writes tests, implements code, runs terminal commands, and refactors based on self-feedback, before asking for your final approval.

## 🚀 Key Features

- **Agentic Orchestration (TDD Loop):** The Agent automatically generates a plan, writes unit tests first, and then writes the implementation to pass those tests.
- **Self-Review Loop:** Analyzes code quality and fixes its own mistakes before presenting the code to you.
- **Workspace Context Awareness:** Automatically scans your VS Code workspace, picks the most relevant files, and injects them into the AI's context so it perfectly understands your existing project structure.
- **Terminal Execution:** The agent can run terminal commands autonomously! If it needs a new NPM package or needs to compile code, it will execute the command natively.
- **Self-Healing:** If a terminal command fails (e.g., a compiler error), the agent captures the `stderr`, feeds it back into its own review loop, and rewrites the code to fix the error!
- **Semantic Auto-Commits:** Automatically generates semantic Git commit messages (`feat: ...`, `fix: ...`) and commits the code for you after changes are applied.
- **Integrated Chat UI:** A beautiful VS Code Sidebar Chat interface that streams the agent's real-time thought process and execution logs.
- **Telemetry Tracking:** Built-in SQLite database tracks the quality of AI-generated responses (acceptance rate, tokens used, iterations per task).

## 🛠️ Usage

1. Open the **AI Pair Programming** Chat Sidebar in VS Code (look for the Robot icon).
2. Type in your task, e.g., *"Install lodash and write a utility to sort arrays."*
3. Watch the real-time logs in the chat as the AI:
   - Analyzes your workspace
   - Creates a Plan
   - Writes Tests
   - Implements Code
   - Reviews its own code
   - Decides to run `npm install lodash`
4. Review the final generated operations in the popup.
5. Click **Approve & Apply**. The files will be created, the terminal commands will run, and the changes will be auto-committed via Git!

## Development

- **Build:** Run `npm run compile` to build the TypeScript files.
- **Package:** Run `npx vsce package` to build the `.vsix` extension file.
- **Debug:** Press `F5` in VS Code to launch the Extension Development Host.

## Architecture

Please refer to [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown of the multi-agent system.
