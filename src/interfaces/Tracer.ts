import { Span } from '../entities/Span';

/**
 * @description Input when creating a new `MikroTrace` instance.
 */
export interface MikroTraceInput {
  serviceName: string;
  correlationId?: string;
  parentContext?: string;
}

/**
 * @description Input when enriching a `MikroTrace` instance.
 */
export interface MikroTraceEnrichInput {
  serviceName?: string;
  correlationId?: string;
  parentContext?: string;
}

/**
 * @description This is how `MikroTrace` will represent each
 * new span. `MikroTrace` will make certain lookups to process
 * parent-child relationships.
 */
export type SpanRepresentation = {
  spanName: string;
  traceId: string;
  spanId: string;
  reference: Span;
};
