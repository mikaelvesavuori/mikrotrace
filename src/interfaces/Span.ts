import { MikroTrace } from '../entities/MikroTrace';
import { DynamicMetadata } from './Metadata';

/**
 * @description The configuration shape of a `Span`. This configuration is
 * what we will manipulate and work on.
 */
export type SpanConfiguration = DynamicMetadata & {
  /**
   * Timestamp when initially called in ISO 8601 (RFC3339) format.
   */
  timestamp: string;
  /**
   * Timestamp when initially called in Unix epoch format.
   */
  timestampEpoch: string;
  /**
   * Start time in Unix epoch. Same as `timestampEpoch`.
   */
  startTime: string;
  /**
   * Duration of the span in milliseconds.
   */
  durationMs: number;
  /**
   * Name of the span.
   * @example GreetUser
   */
  spanName: string;
  /**
   * Name of the span's parent.
   */
  spanParent?: string;
  /**
   * Trace ID for this span. Should be same as `parentTraceId`, else set new one.
   */
  traceId: string;
  /**
   * Span ID for this span. Should always be unique.
   */
  spanId: string;
  /**
   * ID of parent span.
   */
  spanParentId: string;
  /**
   * Object with user-configurable attributes.
   */
  attributes: Record<string, any>;
  /**
   * Correlation ID of the call in which the span is started.
   */
  correlationId: string;
  /**
   * Service name.
   */
  service: string;
  /**
   * Has this span ended?
   * Is set to `true` automatically when calling with `span.end()`.
   */
  isEnded: boolean;
};

/**
 * @description Input for creating a new `Span`.
 */
export type SpanInput = {
  /**
   * An instance of `MikroTrace`.
   */
  tracer: MikroTrace;
  /**
   * Correlation ID of the call in which the span is started.
   */
  correlationId?: string;
  /**
   * Service name.
   */
  service: string;
  /**
   * Name of the span.
   */
  spanName: string;
  /**
   * Span ID of the span's parent.
   */
  parentSpanId?: string;
  /**
   * Trace ID of the span's parent.
   */
  parentTraceId?: string;
  /**
   * Parent span's name.
   */
  parentSpanName?: string;
  /**
   * Dynamic AWS metadata.
   */
  dynamicMetadata?: Record<string, any>;
  /**
   * Static user-provided metadata.
   */
  staticMetadata?: Record<string, any>;
};
