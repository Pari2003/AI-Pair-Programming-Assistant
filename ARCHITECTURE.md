# System Architecture

The AI Pair Programming Assistant is built on a **Multi-Agent Orchestration Model**. Instead of a single monolithic LLM prompt, the workload is distributed across specialized "Agents," each handling a specific part of the software development lifecycle.

## The Agentic Loop

When a user submits a task via the Chat UI, the `AgentOrchestrator` coordinates the following sequence:

### 1. Context Analysis (`AnalyzerAgent`)
- **Role:** Understand the current state of the project.
- **Action:** Scans the VS Code workspace, ignoring standard excluded directories (like `node_modules`). It determines the 3 most relevant files for the current task, reads their contents, and injects them into the prompt to provide the LLM with deep context.

### 2. Planning (`PlannerAgent`)
- **Role:** Break down the goal into actionable steps.
- **Action:** Receives the user's task and the workspace context. It returns a structured JSON plan consisting of step-by-step instructions (e.g., "Step 1: Define interface", "Step 2: Implement class").

### 3. Test-Driven Development (`TesterAgent`)
- **Role:** Ensure code reliability.
- **Action:** Before any implementation is written, this agent writes unit tests for the planned steps to define the expected behavior.

### 4. Implementation (`CoderAgent`)
- **Role:** Write the actual code and execute terminal commands.
- **Action:** Takes the plan and the unit tests, and generates a structured JSON array of operations (`FileOperation`). Operations can include:
  - `write_file`
  - `create_folder`
  - `run_command` (e.g., `npm install`)

### 5. Review & Self-Healing (`CriticAgent`)
- **Role:** Quality assurance.
- **Action:** Reviews the proposed implementation against the unit tests and the original plan.
- **Looping:** If the critic rejects the code, the feedback is sent back to the `CoderAgent`, and the loop repeats (up to 3 times) until the code is approved.

### 6. Human-in-the-Loop Execution
- **Role:** Final safety check.
- **Action:** The Orchestrator presents the approved operations to the user in a VS Code pop-up.
- **Execution:** If the user approves, the orchestrator writes the files and runs the terminal commands natively using Node's `child_process`.
- **Terminal Self-Healing:** If a terminal command fails during execution (e.g., compile error), the orchestrator captures the error and recursively feeds it back into a new agent loop to fix itself.

### 7. Version Control (`GitAgent`)
- **Role:** Source control management.
- **Action:** Once changes are successfully applied, the GitAgent analyzes the `git diff`, generates a semantic commit message, and automatically commits the changes.

## Telemetry Database

A local SQLite database (`telemetry.db`) is maintained in the extension's global storage directory. 
- It tracks the number of tasks run, the success rate, average review iterations, and total tokens used. 
- This data powers the Developer Productivity Dashboard, helping developers track the AI's efficiency over time.
