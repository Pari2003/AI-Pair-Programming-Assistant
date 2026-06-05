"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TesterAgent = void 0;
const llm_client_1 = require("./llm_client");
class TesterAgent {
    client = new llm_client_1.LLMClient();
    async writeTests(planSteps) {
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
exports.TesterAgent = TesterAgent;
//# sourceMappingURL=tester.js.map