"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanAlreadyExistsError = exports.MissingParentSpanError = void 0;
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
//# sourceMappingURL=errors.js.map