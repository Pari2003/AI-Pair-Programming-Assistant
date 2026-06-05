import { OllamaClient } from './ollama_client';

export class AnalyzerAgent {
    private client = new OllamaClient();

    public async analyzeContext(description: string, workspaceFiles: string[]): Promise<{ filesToRead: string[], tokensUsed: number }> {
        const systemPrompt = `You are an expert Codebase Analyzer Agent.
Your goal is to identify which files from the workspace are most relevant to the given task description.
Respond ONLY with a JSON array of up to 3 file paths.
Example: ["src/index.ts", "package.json"]`;

        const prompt = `Task Description:\n${description}\n\nWorkspace Files:\n${workspaceFiles.join('\n')}`;
        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt, "json");
        
        let filesToRead: string[] = [];
        try {
            filesToRead = JSON.parse(response);
            if (!Array.isArray(filesToRead)) {
                filesToRead = [];
            }
        } catch (e) {
            console.error("Failed to parse Analyzer response: ", response);
        }
        
        return { filesToRead, tokensUsed };
    }
}
