"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoderAgent = void 0;
const llm_client_1 = require("./llm_client");
class CoderAgent {
    client = new llm_client_1.LLMClient();
    async writeCode(planSteps, testsCode, feedback) {
        const systemPrompt = `You are an expert Senior Software Engineer Agent. 
Your goal is to write the implementation code that satisfies the given plan and passes the provided unit tests.
If feedback is provided from a previous failed review, you must fix the issues.
You MUST output your response as a valid JSON array of operations. Do not include any other text.
Example format:
[
  { "type": "run_command", "command": "npm install lodash" },
  { "type": "create_folder", "path": "src/components" },
  { "type": "write_file", "path": "src/index.ts", "content": "console.log('hello');" }
]`;
        let prompt = `Plan:\n${planSteps.join('\n')}\n\nTests to pass:\n${testsCode}`;
        if (feedback) {
            prompt += `\n\nCRITICAL FEEDBACK FROM REVIEWER:\n${feedback}\nYou MUST address this feedback.`;
        }
        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt, "json");
        let operations = [];
        try {
            // Attempt to extract JSON if the model wrapped it in markdown code blocks
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : response.trim();
            operations = JSON.parse(jsonString);
        }
        catch (e) {
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
exports.CoderAgent = CoderAgent;
//# sourceMappingURL=coder.js.map