"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Span = void 0;
const crypto_1 = require("crypto");
class Span {
    constructor(input) {
        const { tracer } = input;
        this.tracer = tracer;
        this.configuration = this.produceSpan(input);
    }
    produceSpan(input) {
        const { spanName, parentSpanName, parentSpanId, parentTraceId, correlationId, service } = input;
        const timeNow = Date.now();
        return {
            name: spanName,
            timestamp: new Date(timeNow).toISOString(),
            startTime: `${timeNow}`,
            endTime: `${timeNow}`,
            durationMs: 0,
            spanName,
            spanParent: parentSpanName,
            spanParentId: parentSpanId || '',
            spanId: (0, crypto_1.randomUUID)(),
            traceId: parentTraceId || (0, crypto_1.randomUUID)(),
            attributes: {},
            correlationId: correlationId || '',
            service: service || '',
            isEnded: false
        };
    }
    setAttribute(key, value) {
        this.configuration['attributes'][key] = value;
    }
    setAttributes(attributeObject) {
        const combinedAttributes = Object.assign(this.configuration['attributes'], attributeObject);
        this.configuration['attributes'] = combinedAttributes;
    }
    getConfiguration() {
        return this.configuration;
    }
    end() {
        const config = this.configuration;
        config['durationMs'] = Math.floor(Date.now() - parseInt(config.startTime));
        config['isEnded'] = true;
        delete config['startTime'];
        delete config['endTime'];
        if (!config['spanParentId'])
            delete config['spanParentId'];
        process.stdout.write(JSON.stringify(config) + '\n');
        this.tracer.removeSpan(config['spanName']);
    }
}
exports.Span = Span;
//# sourceMappingURL=Span.js.map