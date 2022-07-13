import { Span } from './Span';
import { MikroTraceInput } from '../interfaces/Tracer';
export declare class MikroTrace {
    private serviceName;
    private spans;
    private correlationId?;
    private parentContext;
    constructor(input: MikroTraceInput);
    setCorrelationId(correlationId: string): void;
    setParentContext(parentContext: string): void;
    private getSpan;
    private getParentIds;
    removeSpan(spanName: string): void;
    start(spanName: string, parentSpanName?: string): Span;
    endAll(): void;
}
