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
exports.DatabaseService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DatabaseService {
    dbPath;
    records = [];
    constructor(dbPath) {
        // Change the path to use a .json extension instead of .db
        this.dbPath = dbPath.replace('.db', '.json');
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.loadRecords();
    }
    loadRecords() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.records = JSON.parse(data);
            }
            catch (e) {
                console.error("Failed to parse telemetry JSON", e);
                this.records = [];
            }
        }
        else {
            this.records = [];
            this.saveRecords();
        }
    }
    saveRecords() {
        fs.writeFileSync(this.dbPath, JSON.stringify(this.records, null, 2), 'utf8');
    }
    logTaskCompletion(record) {
        this.records.push(record);
        this.saveRecords();
    }
    getTelemetryStats() {
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
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.js.map