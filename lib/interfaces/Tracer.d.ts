import { Span } from '../entities/Span';
export interface MikroTraceInput {
    serviceName: string;
    correlationId?: string;
    parentContext?: string;
}
export declare type SpanRepresentation = {
    spanName: string;
    traceId: string;
    spanId: string;
    reference: Span;
};
