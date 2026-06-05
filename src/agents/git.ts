import { exec } from 'child_process';
import { promisify } from 'util';
import { LLMClient } from './llm_client';

const execPromise = promisify(exec);

export class GitAgent {
    private client = new LLMClient();

    public async autoCommit(cwd: string): Promise<string> {
        try {
            // Check if git is initialized
            await execPromise('git status', { cwd });

            // Add all changes
            await execPromise('git add .', { cwd });

            // Get the diff
            const { stdout: diff } = await execPromise('git diff --staged', { cwd });

            if (!diff.trim()) {
                return 'No changes to commit.';
            }

            // Generate commit message
            const systemPrompt = `You are an expert developer. Generate a highly descriptive, semantic Git commit message based on the provided git diff.
Follow the conventional commits format (e.g., "feat: ...", "fix: ...", "refactor: ...").
Respond ONLY with the commit message. Do not use quotes or markdown formatting.`;

            const { response: commitMessage } = await this.client.generate(diff, systemPrompt);
            const cleanMessage = commitMessage.replace(/"/g, '\\"').trim();

            // Commit
            await execPromise(`git commit -m "${cleanMessage}"`, { cwd });
            
            return `Auto-committed: ${cleanMessage}`;
        } catch (e: any) {
            console.error('Auto-commit failed', e);
            return `Auto-commit skipped: ${e.message}`;
        }
    }
}
