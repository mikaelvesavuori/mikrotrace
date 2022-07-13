/**
 * @description Used when we cannot find the parent span.
 */
export class MissingParentSpanError extends Error {
  constructor(parentSpanName: string) {
    super(parentSpanName);
    this.name = 'MissingParentSpanError';
    const message = `No parent span found by the name "${parentSpanName}"!`;
    this.message = message;
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}

/**
 * @description Used when user is attempting to create a span
 * with a name that already exists.
 */
export class SpanAlreadyExistsError extends Error {
  constructor(spanName: string) {
    super(spanName);
    this.name = 'SpanAlreadyExistsError';
    const message = `A span with the name "${spanName}" already exists!`;
    this.message = message;
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}

/**
 * @description Used when user tries to create a span with no name.
 */
export class MissingSpanNameError extends Error {
  constructor() {
    super();
    this.name = 'MissingSpanNameError';
    const message = `Missing "spanName" input when tying to create a new span!`;
    this.message = message;
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}
