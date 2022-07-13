"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MikroTrace = void 0;
const Span_1 = require("./Span");
const errors_1 = require("../application/errors/errors");
class MikroTrace {
    constructor(input) {
        this.parentContext = '';
        const { serviceName } = input;
        this.serviceName = serviceName;
        this.spans = [];
        if (input.correlationId)
            this.setCorrelationId(input.correlationId);
    }
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
    setParentContext(parentContext) {
        this.parentContext = parentContext;
    }
    getSpan(spanName) {
        const span = this.spans.filter((span) => span.spanName === spanName)[0] || null;
        return span;
    }
    getParentIds(spanName, parentSpanName) {
        if (!this.parentContext)
            this.setParentContext(spanName);
        const parentContext = this.parentContext;
        if (parentSpanName) {
            const span = this.getSpan(parentSpanName);
            if (!span)
                throw new errors_1.MissingParentSpanError(parentSpanName);
            return {
                parentSpanId: span['spanId'],
                parentTraceId: span['traceId']
            };
        }
        if (spanName !== parentContext) {
            const span = this.getSpan(parentContext);
            if (span)
                return {
                    parentSpanId: span['spanId'],
                    parentTraceId: span['traceId']
                };
        }
        return {
            parentSpanId: undefined,
            parentTraceId: undefined
        };
    }
    removeSpan(spanName) {
        const spans = this.spans.filter((span) => span.spanName !== spanName);
        this.spans = spans;
    }
    start(spanName, parentSpanName) {
        const spanExists = this.getSpan(spanName);
        if (spanExists)
            throw new errors_1.SpanAlreadyExistsError(spanName);
        const { parentSpanId, parentTraceId } = this.getParentIds(spanName, parentSpanName);
        const newSpan = new Span_1.Span({
            tracer: this,
            correlationId: this.correlationId,
            service: this.serviceName,
            spanName,
            parentSpanId,
            parentTraceId,
            parentSpanName
        });
        const { spanId, traceId } = newSpan.getConfiguration();
        this.spans.push({
            spanName,
            spanId: spanId,
            traceId: traceId,
            reference: newSpan
        });
        return newSpan;
    }
    endAll() {
        this.spans.forEach((spanRep) => spanRep.reference.end());
        this.setParentContext('');
    }
}
exports.MikroTrace = MikroTrace;
//# sourceMappingURL=MikroTrace.js.map