# AI Pair Programming Assistant (VS Code Extension)

An intelligent VS Code extension that orchestrates an agentic "Write → Refactor → Test" loop, featuring autonomous self-review and telemetry-based response quality tracking.

## Motivation
Most AI coding assistants act as passive autocomplete or basic chat interfaces. This project aims to build an **orchestrating agent** that integrates deeply into the IDE workflow. Instead of just generating code, it autonomously runs a loop: writing the code, running tests/linters, and refactoring based on the feedback. Furthermore, it implements telemetry to track the quality of responses over time, solving the critical industry problem of measuring AI effectiveness in the real world.

## Features
- **Agentic Orchestration:** Write → Refactor → Test loop.
- **Self-Review Loop:** Analyzes code quality and fixes its own mistakes before presenting to the user.
- **Telemetry Tracking:** Monitors and tracks the quality of AI-generated responses (acceptance rate, modifications, error rates).
- **IDE Integration:** Deep VS Code integration for seamless developer experience.

*Note: This repository is currently being initialized.*
