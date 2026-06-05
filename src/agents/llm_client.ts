import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';

export class LLMClient {
    public async generate(prompt: string, systemPrompt?: string, format?: string): Promise<{ response: string, tokensUsed: number }> {
        const config = vscode.workspace.getConfiguration('aiAssistant');
        const provider = config.get<string>('modelProvider', 'Ollama');

        if (provider === 'OpenAI') {
            return this.generateOpenAI(config, prompt, systemPrompt, format);
        } else if (provider === 'Anthropic') {
            return this.generateAnthropic(config, prompt, systemPrompt);
        } else {
            return this.generateOllama(config, prompt, systemPrompt, format);
        }
    }

    private async generateOpenAI(config: vscode.WorkspaceConfiguration, prompt: string, systemPrompt?: string, format?: string): Promise<{ response: string, tokensUsed: number }> {
        const apiKey = config.get<string>('openaiApiKey');
        const model = config.get<string>('openaiModel', 'gpt-4o');

        if (!apiKey) {
            throw new Error('OpenAI API Key is not configured. Please set it in Settings.');
        }

        return new Promise((resolve, reject) => {
            const messages = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const body: any = { model, messages };
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
                    } catch (e) {
                        reject(new Error(`Failed to parse OpenAI response: ${responseBody}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    private async generateAnthropic(config: vscode.WorkspaceConfiguration, prompt: string, systemPrompt?: string): Promise<{ response: string, tokensUsed: number }> {
        const apiKey = config.get<string>('anthropicApiKey');
        const model = config.get<string>('anthropicModel', 'claude-3-5-sonnet-20240620');

        if (!apiKey) {
            throw new Error('Anthropic API Key is not configured. Please set it in Settings.');
        }

        return new Promise((resolve, reject) => {
            const body: any = {
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            };
            if (systemPrompt) body.system = systemPrompt;

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
                    } catch (e) {
                        reject(new Error(`Failed to parse Anthropic response: ${responseBody}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    private async generateOllama(config: vscode.WorkspaceConfiguration, prompt: string, systemPrompt?: string, format?: string): Promise<{ response: string, tokensUsed: number }> {
        const model = config.get<string>('ollamaModel', 'llama3.2:1b');

        return new Promise((resolve, reject) => {
            const body: any = {
                model,
                prompt,
                system: systemPrompt,
                stream: false
            };
            if (format) body.format = format;

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
                    } catch (e) {
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
