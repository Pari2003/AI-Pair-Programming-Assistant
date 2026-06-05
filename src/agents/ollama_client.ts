import * as http from 'http';

export class OllamaClient {
    private baseUrl = 'http://localhost:11434/api/generate';
    private model = 'llama3.2:1b'; // Using smaller 1B model due to memory limits

    public async generate(prompt: string, systemPrompt?: string, format?: string): Promise<{ response: string, tokensUsed: number }> {
        return new Promise((resolve, reject) => {
            const body: any = {
                model: this.model,
                prompt: prompt,
                system: systemPrompt,
                stream: false
            };
            if (format) {
                body.format = format;
            }
            const data = JSON.stringify(body);

            const options = {
                hostname: '127.0.0.1',
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
                        if (parsed.error) {
                            reject(new Error(parsed.error));
                            return;
                        }
                        if (parsed.response === undefined) {
                            reject(new Error(`Empty response from Ollama: ${responseBody}`));
                            return;
                        }
                        // Mocking token usage since Ollama returns eval_count and prompt_eval_count
                        const tokensUsed = (parsed.eval_count || 0) + (parsed.prompt_eval_count || 0);
                        resolve({ response: String(parsed.response), tokensUsed });
                    } catch (e) {
                        reject(new Error(`Failed to parse Ollama response: ${responseBody}`));
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
