"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerAgent = void 0;
const llm_client_1 = require("./llm_client");
class PlannerAgent {
    client = new llm_client_1.LLMClient();
    async createPlan(description) {
        const systemPrompt = `You are an expert Software Architect Planner Agent. 
Given a task description, break it down into 3-5 explicit, actionable technical steps.
Respond ONLY with a JSON array of strings representing the steps. Example: ["Step 1...", "Step 2..."]`;
        const { response, tokensUsed } = await this.client.generate(description, systemPrompt, "json");
        try {
            // Attempt to extract the JSON array from the response if the LLM added formatting
            const jsonStr = response.substring(response.indexOf('['), response.lastIndexOf(']') + 1);
            const steps = JSON.parse(jsonStr);
            return { steps, tokensUsed };
        }
        catch (e) {
            console.error("Failed to parse Planner response: ", response);
            return { steps: [description], tokensUsed }; // fallback
        }
    }
}
exports.PlannerAgent = PlannerAgent;
//# sourceMappingURL=planner.js.map