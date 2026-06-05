import { OllamaClient } from './ollama_client';

export interface FileOperation {
    type: 'create_folder' | 'write_file';
    path: string;
    content?: string;
}

export class CoderAgent {
    private client = new OllamaClient();

    public async writeCode(planSteps: string[], testsCode: string, feedback: string): Promise<{ operations: FileOperation[], tokensUsed: number }> {
        const systemPrompt = `You are an expert Senior Software Engineer Agent. 
Your goal is to write the implementation code that satisfies the given plan and passes the provided unit tests.
If feedback is provided from a previous failed review, you must fix the issues.
You MUST output your response as a valid JSON array of operations. Do not include any other text.
Example format:
[
  { "type": "create_folder", "path": "src/components" },
  { "type": "write_file", "path": "src/index.ts", "content": "console.log('hello');" }
]`;

        let prompt = `Plan:\n${planSteps.join('\n')}\n\nTests to pass:\n${testsCode}`;
        if (feedback) {
            prompt += `\n\nCRITICAL FEEDBACK FROM REVIEWER:\n${feedback}\nYou MUST address this feedback.`;
        }

        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt, "json");
        
        let operations: FileOperation[] = [];
        try {
            // Attempt to extract JSON if the model wrapped it in markdown code blocks
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : response.trim();
            operations = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse JSON from CoderAgent", e);
            // Fallback for extreme cases, return as a single file write
            operations = [{
                type: 'write_file',
                path: 'workspace_output.txt',
                content: response
            }];
        }
        
        return { operations, tokensUsed };
    }
}
