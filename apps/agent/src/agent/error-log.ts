import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const defaultLogFilePath = join(process.cwd(), "logs", "agent-validation-errors.log");
const maximumConsoleErrorMessageLength = 240;

export function getAgentValidationErrorLogPath() {
  const logDir = process.env.ERROR_LOG_DIR?.trim();

  return logDir ? join(logDir, "agent-validation-errors.log") : defaultLogFilePath;
}

function getErrorDetails(error: Error) {
  if ("issues" in error && Array.isArray(error.issues)) {
    return error.issues;
  }

  const details = Object.fromEntries(
    Object.entries(error).filter(([key]) => !["cause", "message", "name", "stack"].includes(key)),
  );

  return Object.keys(details).length > 0 ? details : undefined;
}

function serializeSingleError(error: Error) {
  return {
    details: getErrorDetails(error),
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

function serializeCauseChain(cause: unknown): unknown[] | undefined {
  if (!cause) {
    return undefined;
  }

  const causes: unknown[] = [];
  const seenErrors = new Set<Error>();
  let nextCause: unknown = cause;

  while (nextCause) {
    if (!(nextCause instanceof Error)) {
      causes.push(nextCause);
      break;
    }

    if (seenErrors.has(nextCause)) {
      causes.push({ message: "Circular error cause omitted" });
      break;
    }

    seenErrors.add(nextCause);
    causes.push(serializeSingleError(nextCause));
    nextCause = nextCause.cause;
  }

  return causes;
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    ...serializeSingleError(error),
    causes: serializeCauseChain(error.cause),
  };
}

function formatShortErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown validation error";
  const normalizedMessage = message.replace(/\s+/g, " ").trim();

  if (normalizedMessage.length <= maximumConsoleErrorMessageLength) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, maximumConsoleErrorMessageLength - 3)}...`;
}

export function appendAgentValidationErrorLog(input: { context: Record<string, unknown>; error: unknown }) {
  const logFilePath = getAgentValidationErrorLogPath();
  mkdirSync(dirname(logFilePath), { recursive: true });
  appendFileSync(
    logFilePath,
    `${JSON.stringify(
      {
        context: input.context,
        error: serializeError(input.error),
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

export function logAgentValidationError(context: Record<string, unknown>, error: unknown) {
  try {
    appendAgentValidationErrorLog({ context, error });
    const message = formatShortErrorMessage(error);
    console.warn(`Agent validation failed: ${message}. Details written to ${getAgentValidationErrorLogPath()}`);
  } catch (logError) {
    const message = formatShortErrorMessage(error);
    console.warn(`Agent validation failed: ${message}`);
    console.warn("Failed to write agent validation log", logError);
  }
}
