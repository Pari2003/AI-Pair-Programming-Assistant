import { OllamaClient } from './ollama_client';

export class TesterAgent {
    private client = new OllamaClient();

    public async writeTests(planSteps: string[]): Promise<{ code: string, tokensUsed: number }> {
        const systemPrompt = `You are an expert QA Engineer Agent. 
Given a list of implementation steps, write failing unit tests (TDD style) in TypeScript using Jest/Mocha syntax.
Write ONLY the code block. Do not include explanations.`;

        const prompt = `Implementation Plan:\n${planSteps.join('\n')}\nWrite the tests.`;
        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt);
        
        // Extract code block
        const codeMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : response.trim();
        
        return { code, tokensUsed };
    }
}
