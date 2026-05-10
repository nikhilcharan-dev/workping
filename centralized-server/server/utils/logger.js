import winston from "winston";
import WinstonLogstash from "winston-logstash-transport";

const { combine, timestamp, json, printf, colorize } = winston.format;

// Standard console format for development
const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// If Logstash is configured in the environment, add the transport
if (process.env.LOGSTASH_HOST) {
  transports.push(
    new WinstonLogstash.LogstashTransport({
      host: process.env.LOGSTASH_HOST,
      port: process.env.LOGSTASH_PORT || 5000,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), json()), // JSON format for ELK
  defaultMeta: { service: "core-api" },
  transports,
});

export default logger;
