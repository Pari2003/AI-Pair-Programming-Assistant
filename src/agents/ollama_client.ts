import * as http from 'http';

export class OllamaClient {
    private baseUrl = 'http://localhost:11434/api/generate';
    private model = 'llama3.2'; // User's local model

    public async generate(prompt: string, systemPrompt?: string): Promise<{ response: string, tokensUsed: number }> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: this.model,
                prompt: prompt,
                system: systemPrompt,
                stream: false
            });

            const options = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = http.request(options, (res) => {
                let responseBody = '';

                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseBody);
                        // Mocking token usage since Ollama returns eval_count and prompt_eval_count
                        const tokensUsed = (parsed.eval_count || 0) + (parsed.prompt_eval_count || 0);
                        resolve({ response: parsed.response, tokensUsed });
                    } catch (e) {
                        reject(new Error('Failed to parse Ollama response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }
}
