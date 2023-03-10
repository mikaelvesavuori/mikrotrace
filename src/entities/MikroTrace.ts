import { randomUUID } from 'crypto';
import { getMetadata } from 'aws-metadata-utils';

import { Span } from './Span';

import { SpanRepresentation, MikroTraceInput, MikroTraceEnrichInput } from '../interfaces/Tracer';
import { StaticMetadataConfigInput } from '../interfaces/Metadata';

import {
  MissingParentSpanError,
  MissingSpanNameError,
  SpanAlreadyExistsError
} from '../application/errors/errors';

/**
 * @description Custom basic tracer that mildly emulates OpenTelemetry semantics
 * and behavior. Built as a ligher-weight way to handle spans in technical
 * contexts (like AWS Lambda) where OTEL tooling seems brittle at best.
 *
 * Make sure to reuse the same instance across your application to get it
 * working as intended.
 *
 * MikroTrace simplifies the OTEL model a bit:
 * - Only supports a single tracing context
 * - Removes the need to pass in complete instances into the
 * span functions. Use strings to refer to spans.
 */
export class MikroTrace {
  private static instance: MikroTrace;
  private static metadataConfig: StaticMetadataConfigInput | Record<string, any> = {};
  private static serviceName: string;
  private static spans: SpanRepresentation[];
  private static correlationId?: string;
  private static parentContext = '';
  private static traceId: string;
  private static event: any;
  private static context: any;

  private constructor(event: any, context: any) {
    MikroTrace.metadataConfig = {};
    MikroTrace.spans = [];
    MikroTrace.serviceName = '';
    MikroTrace.correlationId = '';
    MikroTrace.parentContext = '';
    MikroTrace.traceId = randomUUID();
    MikroTrace.event = event;
    MikroTrace.context = context;
  }

  /**
   * @description This instantiates MikroTrace. In order to be able
   * to "remember" event and context we use a singleton pattern to
   * reuse the same logical instance.
   *
   * If the `start` method receives any input, that input will
   * overwrite any existing metadata.
   *
   * If you want to "add" to these, you should instead call
   * `enrich()` and pass in your additional data there.
   */
  public static start(input?: MikroTraceInput, forceNewTraceId = false) {
    const serviceName = input?.serviceName || MikroTrace.serviceName || '';
    const correlationId = input?.correlationId || MikroTrace.correlationId || '';
    const parentContext = input?.parentContext || MikroTrace.parentContext || '';
    const event = input?.event || MikroTrace.event || {};
    const context = input?.context || MikroTrace.context || {};

    if (!MikroTrace.instance) MikroTrace.instance = new MikroTrace(event, context);

    MikroTrace.metadataConfig = input?.metadataConfig || {};
    MikroTrace.spans = [];
    MikroTrace.serviceName = serviceName;
    MikroTrace.correlationId = correlationId;
    MikroTrace.parentContext = parentContext;
    MikroTrace.traceId = forceNewTraceId ? randomUUID() : MikroTrace.traceId;
    MikroTrace.event = event;
    MikroTrace.context = context;

    return MikroTrace.instance;
  }

  /**
   * @description Enrich MikroTrace with values post-initialization.
   */
  public static enrich(input: MikroTraceEnrichInput) {
    if (input.serviceName) MikroTrace.serviceName = input.serviceName;
    if (input.correlationId) MikroTrace.setCorrelationId(input.correlationId);
    if (input.parentContext) MikroTrace.parentContext = input.parentContext;
  }

  /**
   * @description An emergency mechanism if you absolutely need to
   * reset the instance to its empty default state.
   */
  public static reset() {
    MikroTrace.instance = new MikroTrace({}, {});
  }

  /**
   * @description Set correlation ID. Make use of this if you
   * were not able to set the correlation ID at the point of
   * instantiating `MikroTrace`.
   *
   * This value will be propagated to all future spans.
   */
  public static setCorrelationId(correlationId: string): void {
    MikroTrace.correlationId = correlationId;
  }

  /**
   * @description Set the parent context. Use this if you
   * want to automatically assign a span as the parent for
   * any future spans.
   *
   * Call it with an empty string to reset it.
   *
   * @example tracer.setParentContext('FullSpan')
   * @example tracer.setParentContext('')
   *
   * This value will be propagated to all future spans.
   */
  public setParentContext(parentContext: string): void {
    MikroTrace.parentContext = parentContext;
  }

  /**
   * @description Output the tracer configuration, for
   * example for debugging needs.
   */
  public getConfiguration() {
    return {
      serviceName: MikroTrace.serviceName,
      spans: MikroTrace.spans,
      correlationId: MikroTrace.correlationId,
      parentContext: MikroTrace.parentContext
    };
  }

  /**
   * @description Get an individual span by name.
   */
  private getSpan(spanName: string): SpanRepresentation | null {
    const span: SpanRepresentation =
      MikroTrace.spans.filter((span: SpanRepresentation) => span.spanName === spanName)[0] || null;
    return span;
  }

  /**
   * @description Utility to get `parentSpanId` and `parentTraceId` from
   * the correct source. If passed a `parentSpanName` we will always use
   * this over any existing context.
   */
  private getParentIds(spanName: string, parentSpanName?: string) {
    // This instance looks fresh so let's set the parent as the current one for later spans
    if (!MikroTrace.parentContext) this.setParentContext(spanName);
    const parentContext = MikroTrace.parentContext;

    // Return values for new parent context
    if (parentSpanName) {
      const span = this.getSpan(parentSpanName);
      if (!span) throw new MissingParentSpanError(parentSpanName);
      return {
        parentSpanId: span['spanId'],
        parentTraceId: span['traceId']
      };
    }

    // Reuse the existing context for child span
    if (spanName !== parentContext) {
      const span = this.getSpan(parentContext);
      if (span)
        return {
          parentSpanId: span['spanId'],
          parentTraceId: span['traceId']
        };
    }

    /**
     * Span name is same as `parentContext`.
     * If `parentContext` and `spanName` are the
     * same we will return undefined to not get a
     * relational loop.
     */
    return {
      parentSpanId: undefined,
      parentTraceId: MikroTrace.traceId
    };
  }

  /**
   * @description Remove an individual span.
   *
   * Avoid calling this manually as the `Span` class will
   * make the necessary call when having ended a span.
   */
  public removeSpan(spanName: string): void {
    const spans: SpanRepresentation[] = MikroTrace.spans.filter(
      (span: SpanRepresentation) => span.spanName !== spanName
    );
    MikroTrace.spans = spans;
  }

  /**
   * @description Start a new trace. This will typically be automatically
   * assigned to the parent trace if one exists. Optionally you can pass in
   * the name of a parent span to link it to its trace ID.
   *
   * @see https://docs.honeycomb.io/getting-data-in/tracing/send-trace-data/
   * ```
   * A root span, the first span in a trace, does not have a parent. As you
   * instrument your code, make sure every span propagates its `trace.trace_id`
   * and` trace.span_id` to any child spans it calls, so that the child span can
   * use those values as its `trace.trace_id` and `trace.parent_id`. Honeycomb uses
   * these relationships to determine the order spans execute and construct the
   * waterfall diagram.
   * ```
   *
   * @param parentSpanName If provided, this will override any existing parent context
   * for this particular trace.
   */
  public start(spanName: string, parentSpanName?: string): Span {
    if (!spanName) throw new MissingSpanNameError();

    const spanExists = this.getSpan(spanName);
    if (spanExists) throw new SpanAlreadyExistsError(spanName);

    const { parentSpanId, parentTraceId } = this.getParentIds(spanName, parentSpanName);
    const dynamicMetadata = getMetadata(MikroTrace.event, MikroTrace.context);

    const newSpan = new Span({
      dynamicMetadata,
      staticMetadata: MikroTrace.metadataConfig,
      tracer: this,
      correlationId: MikroTrace.correlationId || dynamicMetadata.correlationId,
      service: MikroTrace.serviceName || MikroTrace.metadataConfig.service,
      spanName,
      parentSpanId,
      parentTraceId,
      parentSpanName
    });

    // Store local representation so we can make lookups for relations.
    const { spanId, traceId } = newSpan.getConfiguration();
    MikroTrace.spans.push({
      spanName,
      spanId: spanId,
      traceId: traceId,
      reference: newSpan
    });

    return newSpan;
  }

  /**
   * @description Closes all spans.
   *
   * Only use the sparingly and in relevant cases, such as
   * when you need to close all spans in case of an error.
   */
  public endAll(): void {
    MikroTrace.spans.forEach((spanRep: SpanRepresentation) => spanRep.reference.end());
    this.setParentContext('');
  }
}
