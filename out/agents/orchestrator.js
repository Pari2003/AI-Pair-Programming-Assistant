"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const vscode = __importStar(require("vscode"));
const analyzer_1 = require("./analyzer");
const planner_1 = require("./planner");
const tester_1 = require("./tester");
const coder_1 = require("./coder");
const critic_1 = require("./critic");
const git_1 = require("./git");
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class AgentOrchestrator {
    analyzer;
    planner;
    tester;
    coder;
    critic;
    git;
    db;
    constructor(db) {
        this.db = db;
        this.analyzer = new analyzer_1.AnalyzerAgent();
        this.planner = new planner_1.PlannerAgent();
        this.tester = new tester_1.TesterAgent();
        this.coder = new coder_1.CoderAgent();
        this.critic = new critic_1.CriticAgent();
        this.git = new git_1.GitAgent();
    }
    async runTask(description, onMessage) {
        const log = (msg) => {
            vscode.window.showInformationMessage(msg);
            if (onMessage)
                onMessage(msg);
        };
        const taskId = (0, uuid_1.v4)();
        const startTime = Date.now();
        let totalTokens = 0;
        let iterations = 0;
        let success = false;
        try {
            // Step 0: Analyze Context
            log('Analyzer Agent: Scanning workspace context...');
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            let enrichedDescription = description;
            if (workspaceFolder) {
                const { filesToRead, tokensUsed: analyzerTokens } = await this.analyzer.analyzeContext(description, workspaceFolder);
                totalTokens += analyzerTokens;
                if (filesToRead.length > 0) {
                    let contextStr = '\n\n--- Context Files ---\n';
                    for (const filePath of filesToRead) {
                        try {
                            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                            const fileData = await vscode.workspace.fs.readFile(fileUri);
                            contextStr += `\nFile: ${filePath}\n\`\`\`\n${Buffer.from(fileData).toString('utf8')}\n\`\`\`\n`;
                        }
                        catch (e) {
                            console.error(`Failed to read context file: ${filePath}`);
                        }
                    }
                    enrichedDescription += contextStr;
                }
            }
            // Step 1: Planning
            log('Planner Agent: Analyzing task...');
            const plan = await this.planner.createPlan(enrichedDescription);
            totalTokens += plan.tokensUsed;
            // Step 2: TDD Loop (Write Tests First)
            log('Tester Agent: Writing unit tests...');
            const tests = await this.tester.writeTests(plan.steps);
            totalTokens += tests.tokensUsed;
            // Step 3: Implement & Review Loop
            let codeAccepted = false;
            let currentOperations = [];
            let feedback = "";
            while (!codeAccepted && iterations < 3) {
                iterations++;
                log(`Coder Agent: Writing implementation (Attempt ${iterations})...`);
                const implementation = await this.coder.writeCode(plan.steps, tests.code, feedback);
                totalTokens += implementation.tokensUsed;
                currentOperations = implementation.operations;
                log('Critic Agent: Reviewing code...');
                const review = await this.critic.reviewCode(JSON.stringify(currentOperations, null, 2), tests.code);
                totalTokens += review.tokensUsed;
                if (review.approved) {
                    codeAccepted = true;
                    success = true;
                    log('Critic Agent: Code approved!');
                }
                else {
                    feedback = review.feedback;
                    log('Critic Agent: Code rejected. Refactoring...');
                }
            }
            if (success && currentOperations.length > 0) {
                // Human-in-the-loop Validation
                if (!workspaceFolder)
                    throw new Error("No workspace folder open.");
                const previewText = currentOperations.map(op => `[${op.type.toUpperCase()}] ${op.path}`).join('\n');
                // Show the proposed changes in a JSON document
                const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify(currentOperations, null, 2), language: 'json' });
                await vscode.window.showTextDocument(doc, { preview: true });
                const userChoice = await vscode.window.showInformationMessage(`The agent wants to apply ${currentOperations.length} operations to your workspace.\n\nReview the opened JSON file. Do you approve?`, { modal: true }, 'Approve & Apply', 'Reject');
                if (userChoice === 'Approve & Apply') {
                    for (const op of currentOperations) {
                        if (op.type === 'run_command' && op.command) {
                            try {
                                log(`Running command: ${op.command}`);
                                const { stdout } = await execPromise(op.command, { cwd: workspaceFolder.uri.fsPath });
                                log(`Command stdout: ${stdout}`);
                            }
                            catch (e) {
                                log(`Command failed: ${e.message}`);
                                log('Self-Healing: Triggering new agent loop to fix the error...');
                                await this.runTask(`The command "${op.command}" failed with error:\n${e.message}\nPlease fix the issue.`, onMessage);
                                return;
                            }
                        }
                        else {
                            const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, op.path);
                            if (op.type === 'create_folder') {
                                await vscode.workspace.fs.createDirectory(targetUri);
                            }
                            else if (op.type === 'write_file' && op.content) {
                                const parentDir = vscode.Uri.joinPath(targetUri, '..');
                                await vscode.workspace.fs.createDirectory(parentDir); // Ensure parent exists
                                await vscode.workspace.fs.writeFile(targetUri, Buffer.from(op.content, 'utf8'));
                            }
                        }
                    }
                    log('Changes applied successfully!');
                    // Auto-Commit
                    log('Auto-committing changes...');
                    const commitMsg = await this.git.autoCommit(workspaceFolder.uri.fsPath);
                    log(commitMsg);
                }
                else {
                    log('Changes rejected by user.');
                }
            }
            else if (!success) {
                vscode.window.showErrorMessage('Agentic loop failed after maximum iterations.');
                if (onMessage)
                    onMessage('Agentic loop failed after maximum iterations.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error in agentic loop: ${error.message}`);
            if (onMessage)
                onMessage(`Error: ${error.message}`);
        }
        finally {
            // Log Telemetry
            this.db.logTaskCompletion({
                id: taskId,
                taskDescription: description,
                startTime: startTime,
                endTime: Date.now(),
                totalTokens: totalTokens,
                iterations: iterations,
                success: success
            });
        }
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=orchestrator.js.map