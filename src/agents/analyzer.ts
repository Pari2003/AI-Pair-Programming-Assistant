import * as vscode from 'vscode';
import { VectorStore, Document } from './vector_store';

export class AnalyzerAgent {
    private vectorStore = new VectorStore();

    public async analyzeContext(description: string, workspaceFolder: vscode.WorkspaceFolder): Promise<{ filesToRead: string[], tokensUsed: number }> {
        // Find all code files, ignoring typical exclusions
        const uris = await vscode.workspace.findFiles('**/*.*', '{**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/*.png,**/*.jpg,**/*.vsix}');
        
        const docs: Document[] = [];
        // Read file contents (limit to first 1000 files to avoid memory crash in this demo)
        const limit = Math.min(uris.length, 1000);
        for (let i = 0; i < limit; i++) {
            try {
                const fileData = await vscode.workspace.fs.readFile(uris[i]);
                const relativePath = vscode.workspace.asRelativePath(uris[i]);
                docs.push({ id: relativePath, text: Buffer.from(fileData).toString('utf8') });
            } catch (e) {
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
