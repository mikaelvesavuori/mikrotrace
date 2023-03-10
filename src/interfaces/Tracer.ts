import { Span } from '../entities/Span';

import { StaticMetadataConfigInput } from './Metadata';

/**
 * @description Input when creating a new `MikroTrace` instance.
 */
export interface MikroTraceInput {
  /**
   * @description Name of the running service.
   */
  serviceName: string;
  /**
   * @description Correlation ID.
   */
  correlationId?: string;
  /**
   * @description What is the parent context?
   */
  parentContext?: string;
  /**
   * @description AWS `event` object.
   */
  event?: any;
  /**
   * @description AWS `context` object.
   */
  context?: any;
  /**
   * Static metadata configuration object.
   */
  metadataConfig?: StaticMetadataConfigInput | Record<string, any>;
}

/**
 * @description Input when enriching a `MikroTrace` instance.
 */
export interface MikroTraceEnrichInput {
  /**
   * @description Name of the running service.
   */
  serviceName?: string;
  /**
   * @description Correlation ID.
   */
  correlationId?: string;
  /**
   * @description What is the parent context?
   */
  parentContext?: string;
}

/**
 * @description This is how `MikroTrace` will represent each
 * new span. `MikroTrace` will make certain lookups to process
 * parent-child relationships.
 */
export type SpanRepresentation = {
  /**
   * @description Name of the span.
   */
  spanName: string;
  /**
   * @description Trace ID for this specific tracer.
   */
  traceId: string;
  /**
   * @description Span ID for this specific span.
   */
  spanId: string;
  /**
   * @description The span to reference.
   */
  reference: Span;
};
