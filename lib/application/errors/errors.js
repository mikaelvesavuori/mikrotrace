"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingSpanNameError = exports.SpanAlreadyExistsError = exports.MissingParentSpanError = void 0;
class MissingParentSpanError extends Error {
    constructor(parentSpanName) {
        super(parentSpanName);
        this.name = 'MissingParentSpanError';
        const message = `No parent span found by the name "${parentSpanName}"!`;
        this.message = message;
        process.stdout.write(JSON.stringify(message) + '\n');
    }
}
exports.MissingParentSpanError = MissingParentSpanError;
class SpanAlreadyExistsError extends Error {
    constructor(spanName) {
        super(spanName);
        this.name = 'SpanAlreadyExistsError';
        const message = `A span with the name "${spanName}" already exists!`;
        this.message = message;
        process.stdout.write(JSON.stringify(message) + '\n');
    }
}
exports.SpanAlreadyExistsError = SpanAlreadyExistsError;
class MissingSpanNameError extends Error {
    constructor() {
        super();
        this.name = 'MissingSpanNameError';
        const message = `Missing "spanName" input when tying to create a new span!`;
        this.message = message;
        process.stdout.write(JSON.stringify(message) + '\n');
    }
}
exports.MissingSpanNameError = MissingSpanNameError;
//# sourceMappingURL=errors.js.map