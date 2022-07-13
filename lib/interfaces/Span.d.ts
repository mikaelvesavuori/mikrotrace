import { MikroTrace } from '../entities/MikroTrace';
export interface SpanConfiguration {
    name: string;
    timestamp: string;
    startTime: string;
    endTime: string;
    durationMs: number;
    spanName: string;
    spanParent?: string;
    traceId: string;
    spanId: string;
    spanParentId: string;
    attributes: Record<string, any>;
    correlationId: string;
    service: string;
    isEnded: boolean;
}
export declare type SpanInput = {
    tracer: MikroTrace;
    correlationId?: string;
    service: string;
    spanName: string;
    parentSpanId?: string;
    parentTraceId?: string;
    parentSpanName?: string;
};
