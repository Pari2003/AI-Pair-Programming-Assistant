import * as vscode from 'vscode';
import { DatabaseService } from '../telemetry/database';
import { PlannerAgent } from './planner';
import { TesterAgent } from './tester';
import { CoderAgent } from './coder';
import { CriticAgent } from './critic';
import { v4 as uuidv4 } from 'uuid';

export class AgentOrchestrator {
    private planner: PlannerAgent;
    private tester: TesterAgent;
    private coder: CoderAgent;
    private critic: CriticAgent;
    private db: DatabaseService;

    constructor(db: DatabaseService) {
        this.db = db;
        this.planner = new PlannerAgent();
        this.tester = new TesterAgent();
        this.coder = new CoderAgent();
        this.critic = new CriticAgent();
    }

    public async runTask(description: string) {
        const taskId = uuidv4();
        const startTime = Date.now();
        let totalTokens = 0;
        let iterations = 0;
        let success = false;

        try {
            // Step 1: Planning
            vscode.window.showInformationMessage('Planner Agent: Analyzing task...');
            const plan = await this.planner.createPlan(description);
            totalTokens += plan.tokensUsed;

            // Step 2: TDD Loop (Write Tests First)
            vscode.window.showInformationMessage('Tester Agent: Writing unit tests...');
            const tests = await this.tester.writeTests(plan.steps);
            totalTokens += tests.tokensUsed;

            // Step 3: Implement & Review Loop
            let codeAccepted = false;
            let currentOperations: any[] = [];
            let feedback = "";

            while (!codeAccepted && iterations < 3) {
                iterations++;
                vscode.window.showInformationMessage(`Coder Agent: Writing implementation (Attempt ${iterations})...`);
                
                const implementation = await this.coder.writeCode(plan.steps, tests.code, feedback);
                totalTokens += implementation.tokensUsed;
                currentOperations = implementation.operations;

                vscode.window.showInformationMessage('Critic Agent: Reviewing code...');
                const review = await this.critic.reviewCode(JSON.stringify(currentOperations, null, 2), tests.code);
                totalTokens += review.tokensUsed;

                if (review.approved) {
                    codeAccepted = true;
                    success = true;
                    vscode.window.showInformationMessage('Critic Agent: Code approved!');
                } else {
                    feedback = review.feedback;
                    vscode.window.showWarningMessage('Critic Agent: Code rejected. Refactoring...');
                }
            }

            if (success && currentOperations.length > 0) {
                // Human-in-the-loop Validation
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) throw new Error("No workspace folder open.");

                const previewText = currentOperations.map(op => `[${op.type.toUpperCase()}] ${op.path}`).join('\n');
                
                // Show the proposed changes in a JSON document
                const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify(currentOperations, null, 2), language: 'json' });
                await vscode.window.showTextDocument(doc, { preview: true });

                const userChoice = await vscode.window.showInformationMessage(
                    `The agent wants to apply ${currentOperations.length} operations to your workspace.\n\nReview the opened JSON file. Do you approve?`,
                    { modal: true },
                    'Approve & Apply',
                    'Reject'
                );

                if (userChoice === 'Approve & Apply') {
                    for (const op of currentOperations) {
                        const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, op.path);
                        if (op.type === 'create_folder') {
                            await vscode.workspace.fs.createDirectory(targetUri);
                        } else if (op.type === 'write_file' && op.content) {
                            const parentDir = vscode.Uri.joinPath(targetUri, '..');
                            await vscode.workspace.fs.createDirectory(parentDir); // Ensure parent exists
                            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(op.content, 'utf8'));
                        }
                    }
                    vscode.window.showInformationMessage('Changes applied successfully!');
                } else {
                    vscode.window.showWarningMessage('Changes rejected by user.');
                }
            } else if (!success) {
                vscode.window.showErrorMessage('Agentic loop failed after maximum iterations.');
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Error in agentic loop: ${error.message}`);
        } finally {
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
