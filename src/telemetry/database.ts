import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface TelemetryRecord {
    id: string;
    taskDescription: string;
    startTime: number;
    endTime: number;
    totalTokens: number;
    iterations: number;
    success: boolean;
}

export class DatabaseService {
    private db: Database.Database;

    constructor(dbPath: string) {
        // Ensure the directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    private initializeSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS telemetry (
                id TEXT PRIMARY KEY,
                task_description TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                iterations INTEGER NOT NULL,
                success INTEGER NOT NULL
            );
        `);
    }

    public logTaskCompletion(record: TelemetryRecord) {
        const stmt = this.db.prepare(`
            INSERT INTO telemetry (id, task_description, start_time, end_time, total_tokens, iterations, success)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            record.id,
            record.taskDescription,
            record.startTime,
            record.endTime,
            record.totalTokens,
            record.iterations,
            record.success ? 1 : 0
        );
    }

    public getTelemetryStats() {
        const rowCount = this.db.prepare("SELECT COUNT(*) as count FROM telemetry").get() as { count: number };
        if (rowCount.count === 0) {
            return { totalTasks: 0, avgIterations: 0, successRate: 0, totalTokens: 0 };
        }

        const stats = this.db.prepare(`
            SELECT 
                COUNT(*) as totalTasks,
                AVG(iterations) as avgIterations,
                SUM(success) * 1.0 / COUNT(*) as successRate,
                SUM(total_tokens) as totalTokens
            FROM telemetry
        `).get() as any;

        return {
            totalTasks: stats.totalTasks,
            avgIterations: stats.avgIterations,
            successRate: stats.successRate,
            totalTokens: stats.totalTokens
        };
    }
}
