"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticAgent = void 0;
const llm_client_1 = require("./llm_client");
class CriticAgent {
    client = new llm_client_1.LLMClient();
    async reviewCode(implementationCode, testsCode) {
        const systemPrompt = `You are a strict, senior Code Reviewer Agent.
Evaluate the provided implementation code against the tests. Look for:
1. Security vulnerabilities.
2. Unhandled edge cases.
3. Code smells or poor performance.
Respond with a JSON object containing two fields:
- "approved": boolean (true if the code is excellent, false if it needs work)
- "feedback": string (empty if approved, otherwise detailed instructions on what needs to be fixed)

Example:
{"approved": false, "feedback": "You missed a null check on line 12 and the regex is vulnerable to ReDoS."}`;
        const prompt = `Implementation:\n${implementationCode}\n\nTests:\n${testsCode}`;
        const { response, tokensUsed } = await this.client.generate(prompt, systemPrompt, "json");
        try {
            const jsonStr = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
            const review = JSON.parse(jsonStr);
            return {
                approved: review.approved,
                feedback: review.feedback,
                tokensUsed
            };
        }
        catch (e) {
            console.error("Failed to parse Critic response: ", response);
            // Default to failing if parsing fails to enforce strictness
            return {
                approved: false,
                feedback: `Critic failed to format response correctly. Raw response: ${response}`,
                tokensUsed
            };
        }
    }
}
exports.CriticAgent = CriticAgent;
//# sourceMappingURL=critic.js.map