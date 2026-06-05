import * as vscode from 'vscode';
import { DatabaseService } from './telemetry/database';
import { AgentOrchestrator } from './agents/orchestrator';
import { ChatViewProvider } from './chatView';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Pair Programming Assistant is now active!');

    // Initialize Telemetry Database
    const dbPath = vscode.Uri.joinPath(context.globalStorageUri, 'telemetry.db').fsPath;
    const dbService = new DatabaseService(dbPath);

    // Initialize Agent Orchestrator
    const orchestrator = new AgentOrchestrator(dbService);

    // Register Chat View
    const provider = new ChatViewProvider(context.extensionUri, orchestrator);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
    );

    // Command: Start Task (Legacy Input Box)
    let startTaskDisposable = vscode.commands.registerCommand('aiAssistant.startTask', async () => {
        const taskDescription = await vscode.window.showInputBox({
            prompt: "What would you like me to build or fix?",
            placeHolder: "e.g., Create a new User model with tests"
        });

        if (taskDescription) {
            vscode.window.showInformationMessage(`Starting agentic loop for: ${taskDescription}`);
            await orchestrator.runTask(taskDescription);
        }
    });

    // Command: Show Dashboard
    let showDashboardDisposable = vscode.commands.registerCommand('aiAssistant.showDashboard', () => {
        // Create Webview Panel
        const panel = vscode.window.createWebviewPanel(
            'telemetryDashboard',
            'AI Productivity Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        const stats = dbService.getTelemetryStats();
        panel.webview.html = getWebviewContent(stats);
    });

    context.subscriptions.push(startTaskDisposable);
    context.subscriptions.push(showDashboardDisposable);
}

export function deactivate() {}

function getWebviewContent(stats: any) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Telemetry Dashboard</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
        h1 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
        .stat-card { border: 1px solid var(--vscode-widget-border); padding: 15px; margin-bottom: 10px; border-radius: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>Developer Productivity Dashboard</h1>
    <div class="stat-card">
        <div>Total Tasks Run</div>
        <div class="stat-value">${stats.totalTasks}</div>
    </div>
    <div class="stat-card">
        <div>Average Review Iterations</div>
        <div class="stat-value">${stats.avgIterations.toFixed(2)} tries/task</div>
    </div>
    <div class="stat-card">
        <div>Success Rate</div>
        <div class="stat-value">${(stats.successRate * 100).toFixed(1)}%</div>
    </div>
    <div class="stat-card">
        <div>Total Tokens Used</div>
        <div class="stat-value">${stats.totalTokens}</div>
    </div>
</body>
</html>`;
}
