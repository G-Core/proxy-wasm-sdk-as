import { get_current_time_nanoseconds, LogLevelValues } from "../../runtime";

let logLevel: LogLevelValues = LogLevelValues.info;

/**
 * Sets the logging level, proxy_get_log_level is not yet implemented in FastEdge.
 * @param {LogLevelValues} level  The logging level to set.
 * @returns {void}
 */
function setLogLevel(level: LogLevelValues): void {
  logLevel = level;
}

/**
 * Temporary fix for proxy_log not being implemented in FastEdge.
 * The function relies on @assemblyscript/wasi-shim to print to standard output.
 * @param {LogLevelValues} level  The logging level to use.
 * @param {string} logMessage  The logging message to log.
 * @returns {void}
 */
function log(level: LogLevelValues, logMessage: string): void {
  if (level >= logLevel) {
    process.stdout.write(logMessage + "\n");
  }
}

function getCurrentTime(): u64 {
  return get_current_time_nanoseconds() / 1_000_000; // Convert nanoseconds to milliseconds
}

export { getCurrentTime, log, LogLevelValues, setLogLevel };
