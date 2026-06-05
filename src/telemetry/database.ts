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
    private dbPath: string;
    private records: TelemetryRecord[] = [];

    constructor(dbPath: string) {
        // Change the path to use a .json extension instead of .db
        this.dbPath = dbPath.replace('.db', '.json');
        
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.loadRecords();
    }

    private loadRecords() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.records = JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse telemetry JSON", e);
                this.records = [];
            }
        } else {
            this.records = [];
            this.saveRecords();
        }
    }

    private saveRecords() {
        fs.writeFileSync(this.dbPath, JSON.stringify(this.records, null, 2), 'utf8');
    }

    public logTaskCompletion(record: TelemetryRecord) {
        this.records.push(record);
        this.saveRecords();
    }

    public getTelemetryStats() {
        if (this.records.length === 0) {
            return { totalTasks: 0, avgIterations: 0, successRate: 0, totalTokens: 0 };
        }

        const totalTasks = this.records.length;
        const totalIterations = this.records.reduce((sum, r) => sum + r.iterations, 0);
        const successfulTasks = this.records.filter(r => r.success).length;
        const totalTokens = this.records.reduce((sum, r) => sum + r.totalTokens, 0);

        return {
            totalTasks: totalTasks,
            avgIterations: totalIterations / totalTasks,
            successRate: successfulTasks / totalTasks,
            totalTokens: totalTokens
        };
    }
}
