"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMClient = void 0;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
class LLMClient {
    async generate(prompt, systemPrompt, format) {
        const config = vscode.workspace.getConfiguration('aiAssistant');
        const provider = config.get('modelProvider', 'Ollama');
        if (provider === 'OpenAI') {
            return this.generateOpenAI(config, prompt, systemPrompt, format);
        }
        else if (provider === 'Anthropic') {
            return this.generateAnthropic(config, prompt, systemPrompt);
        }
        else {
            return this.generateOllama(config, prompt, systemPrompt, format);
        }
    }
    async generateOpenAI(config, prompt, systemPrompt, format) {
        const apiKey = config.get('openaiApiKey');
        const model = config.get('openaiModel', 'gpt-4o');
        if (!apiKey) {
            throw new Error('OpenAI API Key is not configured. Please set it in Settings.');
        }
        return new Promise((resolve, reject) => {
            const messages = [];
            if (systemPrompt)
                messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });
            const body = { model, messages };
            if (format === 'json') {
                body.response_format = { type: 'json_object' };
            }
            const data = JSON.stringify(body);
            const options = {
                hostname: 'api.openai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`OpenAI Error: ${responseBody}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(responseBody);
                        const response = parsed.choices[0].message.content;
                        const tokensUsed = parsed.usage.total_tokens;
                        resolve({ response, tokensUsed });
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse OpenAI response: ${responseBody}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    async generateAnthropic(config, prompt, systemPrompt) {
        const apiKey = config.get('anthropicApiKey');
        const model = config.get('anthropicModel', 'claude-3-5-sonnet-20240620');
        if (!apiKey) {
            throw new Error('Anthropic API Key is not configured. Please set it in Settings.');
        }
        return new Promise((resolve, reject) => {
            const body = {
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            };
            if (systemPrompt)
                body.system = systemPrompt;
            const data = JSON.stringify(body);
            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`Anthropic Error: ${responseBody}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(responseBody);
                        const response = parsed.content[0].text;
                        const tokensUsed = parsed.usage.input_tokens + parsed.usage.output_tokens;
                        resolve({ response, tokensUsed });
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse Anthropic response: ${responseBody}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    async generateOllama(config, prompt, systemPrompt, format) {
        const model = config.get('ollamaModel', 'llama3.2:1b');
        return new Promise((resolve, reject) => {
            const body = {
                model,
                prompt,
                system: systemPrompt,
                stream: false
            };
            if (format)
                body.format = format;
            const data = JSON.stringify(body);
            const options = {
                hostname: '127.0.0.1',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const req = http.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseBody);
                        if (parsed.error) {
                            reject(new Error(parsed.error));
                            return;
                        }
                        const response = String(parsed.response);
                        const tokensUsed = (parsed.eval_count || 0) + (parsed.prompt_eval_count || 0);
                        resolve({ response, tokensUsed });
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse Ollama response: ${responseBody}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
}
exports.LLMClient = LLMClient;
//# sourceMappingURL=llm_client.js.map