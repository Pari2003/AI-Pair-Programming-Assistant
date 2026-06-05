"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewProvider = void 0;
class ChatViewProvider {
    _extensionUri;
    orchestrator;
    static viewType = 'aiAssistant.chatView';
    _view;
    constructor(_extensionUri, orchestrator) {
        this._extensionUri = _extensionUri;
        this.orchestrator = orchestrator;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendTask':
                    {
                        const taskDescription = data.value;
                        await this.orchestrator.runTask(taskDescription, (message) => {
                            this.sendMessageToWebview(message);
                        });
                        this._view?.webview.postMessage({ type: 'taskComplete' });
                        break;
                    }
            }
        });
    }
    sendMessageToWebview(message) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'agentMessage', value: message });
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Assistant Chat</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    box-sizing: border-box;
                }
                #chat-history {
                    flex-grow: 1;
                    overflow-y: auto;
                    margin-bottom: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    background-color: var(--vscode-input-background);
                }
                .message {
                    margin-bottom: 10px;
                    padding: 8px;
                    border-radius: 4px;
                }
                .user-message {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    align-self: flex-end;
                }
                .agent-message {
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    border: 1px solid var(--vscode-panel-border);
                }
                #input-container {
                    display: flex;
                    flex-direction: column;
                }
                textarea {
                    width: 100%;
                    padding: 8px;
                    box-sizing: border-box;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    margin-bottom: 5px;
                    resize: vertical;
                    min-height: 60px;
                }
                button {
                    padding: 8px 12px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div id="chat-history">
                <div class="message agent-message">Hello! I am your AI Pair Programming Assistant. What would you like to build today?</div>
            </div>
            <div id="input-container">
                <textarea id="task-input" placeholder="Ask the agent to do something..."></textarea>
                <button id="send-btn">Send</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const chatHistory = document.getElementById('chat-history');
                const taskInput = document.getElementById('task-input');
                const sendBtn = document.getElementById('send-btn');

                sendBtn.addEventListener('click', () => {
                    const text = taskInput.value.trim();
                    if (text) {
                        appendMessage('user-message', text);
                        vscode.postMessage({ type: 'sendTask', value: text });
                        taskInput.value = '';
                        sendBtn.disabled = true;
                        sendBtn.innerText = 'Working...';
                    }
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'agentMessage':
                            appendMessage('agent-message', message.value);
                            break;
                        case 'taskComplete':
                            sendBtn.disabled = false;
                            sendBtn.innerText = 'Send';
                            appendMessage('agent-message', 'Task completed. Review the changes if a popup appeared!');
                            break;
                    }
                });

                function appendMessage(className, text) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'message ' + className;
                    msgDiv.innerText = text;
                    chatHistory.appendChild(msgDiv);
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }
            </script>
        </body>
        </html>`;
    }
}
exports.ChatViewProvider = ChatViewProvider;
//# sourceMappingURL=chatView.js.map