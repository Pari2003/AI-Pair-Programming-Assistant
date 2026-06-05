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
exports.VectorStore = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
class VectorStore {
    documents = [];
    async addDocuments(docs) {
        const apiKey = vscode.workspace.getConfiguration('aiAssistant').get('openaiApiKey');
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
        }
        catch (e) {
            console.error(`VectorStore: Failed to fetch embeddings: ${e.message}`);
            this.documents = docs;
        }
    }
    async search(query, topK = 3) {
        if (this.documents.length === 0)
            return [];
        const apiKey = vscode.workspace.getConfiguration('aiAssistant').get('openaiApiKey');
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
                similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
            }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK)
                .map(item => item.doc);
        }
        catch (e) {
            console.error(`VectorStore Search Error: ${e.message}`);
            return this.documents.slice(0, topK); // Fallback to first K docs
        }
    }
    async fetchEmbeddings(inputs, apiKey) {
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
                        resolve(parsed.data.map((item) => item.embedding));
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse embeddings: ${responseBody}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    naiveKeywordScore(query, text) {
        const keywords = query.toLowerCase().split(/\s+/);
        const lowerText = text.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
            if (lowerText.includes(kw))
                score++;
        }
        return score;
    }
}
exports.VectorStore = VectorStore;
//# sourceMappingURL=vector_store.js.map