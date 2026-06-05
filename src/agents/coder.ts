import { OllamaClient } from './ollama_client';

export class CoderAgent {
    private client = new OllamaClient();

    public async writeCode(planSteps: string[], testsCode: string, feedback: string): Promise<{ code: string, tokensUsed: number }> {
        const systemPrompt = `You are an expert Senior Software Engineer Agent. 
Your goal is to write the implementation code that satisfies the given plan and passes the provided unit tests.
If feedback is provided from a previous failed review, you must fix the issues.
Write ONLY the TypeScript code block. Do not include explanations.`;

        let prompt = `Plan:\n${planSteps.join('\n')}\n\nTests to pass:\n${testsCode}`;
        if (feedback) {
            prompt += `\n\nCRITICAL FEEDBACK FROM REVIEWER:\n${feedback}\nYou MUST address this feedback.`;
        }

        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt);
        
        // Extract code block
        const codeMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : response.trim();
        
        return { code, tokensUsed };
    }
}
