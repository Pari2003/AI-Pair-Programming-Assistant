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
            let currentCode = "";
            let feedback = "";

            while (!codeAccepted && iterations < 3) {
                iterations++;
                vscode.window.showInformationMessage(`Coder Agent: Writing implementation (Attempt ${iterations})...`);
                
                const implementation = await this.coder.writeCode(plan.steps, tests.code, feedback);
                totalTokens += implementation.tokensUsed;
                currentCode = implementation.code;

                vscode.window.showInformationMessage('Critic Agent: Reviewing code...');
                const review = await this.critic.reviewCode(currentCode, tests.code);
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

            if (success) {
                // Here we would apply the code to the actual workspace via VS Code API
                const doc = await vscode.workspace.openTextDocument({ content: currentCode, language: 'typescript' });
                vscode.window.showTextDocument(doc);
            } else {
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
