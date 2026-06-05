import * as vscode from 'vscode';
import * as https from 'https';

export interface Document {
    id: string; // Typically file path
    text: string;
    embedding?: number[];
}

export class VectorStore {
    private documents: Document[] = [];

    public async addDocuments(docs: { id: string, text: string }[]): Promise<void> {
        const apiKey = vscode.workspace.getConfiguration('aiAssistant').get<string>('openaiApiKey');
        if (!apiKey) {
            console.warn('VectorStore: No OpenAI API Key found. Skipping embedding generation.');
            this.documents = docs; // Store without embeddings (fallback to basic substring matching later if needed)
            return;
        }

        const texts = docs.map(d => d.text.substring(0, 8000)); // Truncate to avoid massive token limits
        
        try {
            const embeddings = await this.fetchEmbeddings(texts, apiKey);
            this.documents = docs.map((doc, i) => ({
                ...doc,
                embedding: embeddings[i]
            }));
        } catch (e: any) {
            console.error(`VectorStore: Failed to fetch embeddings: ${e.message}`);
            this.documents = docs;
        }
    }

    public async search(query: string, topK: number = 3): Promise<Document[]> {
        if (this.documents.length === 0) return [];

        const apiKey = vscode.workspace.getConfiguration('aiAssistant').get<string>('openaiApiKey');
        if (!apiKey || !this.documents[0].embedding) {
            // Fallback: Naive keyword search if embeddings are disabled/failed
            return this.documents
                .map(doc => ({ doc, score: this.naiveKeywordScore(query, doc.text) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .map(item => item.doc);
        }

        try {
            const [queryEmbedding] = await this.fetchEmbeddings([query], apiKey);
            
            return this.documents
                .filter(doc => doc.embedding)
                .map(doc => ({
                    doc,
                    similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!)
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK)
                .map(item => item.doc);
        } catch (e: any) {
            console.error(`VectorStore Search Error: ${e.message}`);
            return this.documents.slice(0, topK); // Fallback to first K docs
        }
    }

    private async fetchEmbeddings(inputs: string[], apiKey: string): Promise<number[][]> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: 'text-embedding-3-small',
                input: inputs
            });

            const options = {
                hostname: 'api.openai.com',
                path: '/v1/embeddings',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`OpenAI Embedding Error: ${responseBody}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(responseBody);
                        resolve(parsed.data.map((item: any) => item.embedding));
                    } catch (e) {
                        reject(new Error(`Failed to parse embeddings: ${responseBody}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private naiveKeywordScore(query: string, text: string): number {
        const keywords = query.toLowerCase().split(/\s+/);
        const lowerText = text.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
            if (lowerText.includes(kw)) score++;
        }
        return score;
    }
}
