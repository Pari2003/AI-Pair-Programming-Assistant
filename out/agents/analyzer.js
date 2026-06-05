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
exports.AnalyzerAgent = void 0;
const vscode = __importStar(require("vscode"));
const vector_store_1 = require("./vector_store");
class AnalyzerAgent {
    vectorStore = new vector_store_1.VectorStore();
    async analyzeContext(description, workspaceFolder) {
        // Find all code files, ignoring typical exclusions
        const uris = await vscode.workspace.findFiles('**/*.*', '{**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/*.png,**/*.jpg,**/*.vsix}');
        const docs = [];
        // Read file contents (limit to first 1000 files to avoid memory crash in this demo)
        const limit = Math.min(uris.length, 1000);
        for (let i = 0; i < limit; i++) {
            try {
                const fileData = await vscode.workspace.fs.readFile(uris[i]);
                const relativePath = vscode.workspace.asRelativePath(uris[i]);
                docs.push({ id: relativePath, text: Buffer.from(fileData).toString('utf8') });
            }
            catch (e) {
                // Ignore unreadable files
            }
        }
        // Add documents to Vector Store (which fetches embeddings)
        await this.vectorStore.addDocuments(docs);
        // Perform semantic search
        const results = await this.vectorStore.search(description, 3);
        const filesToRead = results.map(doc => doc.id);
        return { filesToRead, tokensUsed: 0 }; // Tokens used for embeddings are tracked separately by OpenAI billing
    }
}
exports.AnalyzerAgent = AnalyzerAgent;
//# sourceMappingURL=analyzer.js.map