class LogStore {
    constructor() {
        this.logs = [];
        this.maxLogs = 50;
        this.listeners = [];
    }

    addLog(log) {
        const newLog = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            ...log,
        };
        this.logs = [newLog, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        this.notify();
    }

    on(event, callback) {
        if (event === "change") {
            this.listeners.push(callback);
        }
    }

    off(event, callback) {
        if (event === "change") {
            this.listeners = this.listeners.filter((l) => l !== callback);
        }
    }

    notify() {
        this.listeners.forEach((callback) => callback(this.logs));
    }
}

const logStore = new LogStore();
export default logStore;
