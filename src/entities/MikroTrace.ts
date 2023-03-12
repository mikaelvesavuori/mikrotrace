import { getMetadata } from 'aws-metadata-utils';

import { Span } from './Span';

import { SpanRepresentation, MikroTraceInput, MikroTraceEnrichInput } from '../interfaces/Tracer';
import { StaticMetadataConfigInput } from '../interfaces/Metadata';

import { getRandomBytes } from '../frameworks/getRandomBytes';

import {
  MissingParentSpanError,
  MissingSpanNameError,
  SpanAlreadyExistsError
} from '../application/errors/errors';
import { SpanConfiguration } from '../interfaces/Span';

/**
 * @description Custom basic tracer that mildly emulates OpenTelemetry semantics
 * and behavior. Built as a ligher-weight way to handle spans in technical
 * contexts (like AWS Lambda) where OTel tooling seems brittle at best.
 *
 * Make sure to reuse the same instance across your application to get it
 * working as intended.
 *
 * MikroTrace simplifies the OTel model a bit:
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
  private static samplingLevel: number;
  private static isTraceSampled: boolean;

  private constructor(event: any, context: any) {
    MikroTrace.metadataConfig = {};
    MikroTrace.spans = [];
    MikroTrace.serviceName = '';
    MikroTrace.correlationId = '';
    MikroTrace.parentContext = '';
    MikroTrace.traceId = getRandomBytes(32);
    MikroTrace.event = event;
    MikroTrace.context = context;
    MikroTrace.samplingLevel = this.initSampleLevel();
    MikroTrace.isTraceSampled = true;
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
   *
   * Running this without input will also force a new `traceId`.
   */
  public static start(input?: MikroTraceInput) {
    const serviceName = input?.serviceName || MikroTrace.serviceName || '';
    const correlationId = input?.correlationId || MikroTrace.correlationId || '';
    const parentContext = input?.parentContext || MikroTrace.parentContext || '';
    const event = input?.event || MikroTrace.event || {};
    const context = input?.context || MikroTrace.context || {};

    if (!MikroTrace.instance) MikroTrace.instance = new MikroTrace(event, context);

    MikroTrace.metadataConfig = input?.metadataConfig || {};
    MikroTrace.serviceName = serviceName;
    MikroTrace.correlationId = correlationId;
    MikroTrace.parentContext = parentContext;
    MikroTrace.traceId = getRandomBytes(32);
    MikroTrace.event = event;
    MikroTrace.context = context;

    return MikroTrace.instance;
  }

  /**
   * @description Returns the current instance of MikroTrace without
   * resetting anything or otherwise affecting the current state.
   */
  public static continue() {
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
    if (parentSpanName) {
      const parentSpan = this.getSpan(parentSpanName);
      if (!parentSpan) throw new MissingParentSpanError(parentSpanName);
    }

    const dynamicMetadata = getMetadata(MikroTrace.event, MikroTrace.context);
    const parentSpan = this.getSpan(MikroTrace.parentContext);
    const span = this.createSpan(spanName, dynamicMetadata, parentSpanName, parentSpan);

    if (this.shouldSampleTrace()) this.addSpan(span);

    this.setParentContext(spanName);

    return span;
  }

  /**
   * @description An emergency mechanism if you absolutely need to
   * reset the instance to its empty default state.
   */
  public static reset() {
    MikroTrace.instance = new MikroTrace({}, {});
  }

  /**
   * @description Initialize the sample rate level.
   * Only accepts numbers or strings that can convert to numbers.
   * The default is to use all traces (i.e. `100` percent).
   */
  private initSampleLevel(): number {
    const envValue = process.env.MIKROTRACE_SAMPLE_RATE;
    if (envValue) {
      const isNumeric = !Number.isNaN(envValue) && !Number.isNaN(parseFloat(envValue));
      if (isNumeric) return parseFloat(envValue);
    }
    return 100;
  }

  /**
   * @description Check if MicroTrace has sampled the last trace.
   * Will only return true value _after_ having output an actual trace.
   */
  public isTraceSampled() {
    return MikroTrace.isTraceSampled;
  }

  /**
   * @description Set sampling rate of traces as a number between 0 and 100.
   */
  public setSamplingRate(samplingPercent: number): number {
    if (typeof samplingPercent !== 'number') return MikroTrace.samplingLevel;

    if (samplingPercent < 0) samplingPercent = 0;
    if (samplingPercent > 100) samplingPercent = 100;

    MikroTrace.samplingLevel = samplingPercent;
    return samplingPercent;
  }

  /**
   * @description Utility to check if a log should be sampled (written) based
   * on the currently set `samplingLevel`. This uses a 0-100 scale.
   *
   * If the random number is lower than (or equal to) the sampling level,
   * then we may sample the log.
   */
  private shouldSampleTrace(): boolean {
    const logWillBeSampled = Math.random() * 100 <= MikroTrace.samplingLevel;
    MikroTrace.isTraceSampled = logWillBeSampled;
    return logWillBeSampled;
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
      parentContext: MikroTrace.parentContext,
      traceId: MikroTrace.traceId
    };
  }

  /**
   * @description Returns a string that can be used as the
   * content of a W3C `traceparent` HTTP header.
   * @see https://www.w3.org/TR/trace-context/#traceparent-header
   */
  public getTraceHeader(spanConfig: SpanConfiguration) {
    // Use the W3C-recommended first version
    const version = '00';
    // Use MikroTrace's trace ID
    const traceId = MikroTrace.traceId;
    // Use the parent span's ID if available, else use the ID of the current span
    const parentId = (() => {
      const parentSpan = this.getSpan(MikroTrace.parentContext);
      return parentSpan && parentSpan.parentSpanId ? parentSpan.parentSpanId : spanConfig.spanId;
    })();
    // As per W3C recommendations
    const traceFlags = this.isTraceSampled() ? '01' : '00';

    return `${version}-${traceId}-${parentId}-${traceFlags}`;
  }

  /**
   * @description Request to create a valid Span.
   */
  private createSpan(
    spanName: string,
    dynamicMetadata: any,
    parentSpanName?: string,
    parentSpan?: any
  ): Span {
    return new Span({
      dynamicMetadata,
      staticMetadata: MikroTrace.metadataConfig,
      tracer: this,
      correlationId: MikroTrace.correlationId || dynamicMetadata.correlationId,
      service: MikroTrace.serviceName || MikroTrace.metadataConfig.service,
      spanName,
      parentSpanId: parentSpan?.spanId || '',
      parentSpanName: parentSpanName || parentSpan?.spanName || '',
      parentTraceId: MikroTrace.traceId
    });
  }

  /**
   * @description Store local representation so we can make lookups for relations.
   */
  private addSpan(span: Span) {
    const { spanName, spanId, traceId, spanParentId } = span.getConfiguration();

    MikroTrace.spans.push({
      spanName,
      spanId,
      traceId,
      parentSpanId: spanParentId,
      reference: span
    });
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
   * @description Get an individual span by ID.
   */
  private getSpanById(spanId: string): SpanRepresentation | null {
    const span: SpanRepresentation =
      MikroTrace.spans.filter((span: SpanRepresentation) => span.spanId === spanId)[0] || null;
    return span;
  }

  /**
   * @description Remove an individual span.
   *
   * Avoid calling this manually as the `Span` class will
   * make the necessary call when having ended a span.
   */
  public removeSpan(spanName: string): void {
    const parentSpanId = MikroTrace.spans.filter(
      (span: SpanRepresentation) => span.spanName === spanName
    )[0]?.parentSpanId;

    const parentSpan = this.getSpanById(parentSpanId)?.spanName || '';

    const spans = MikroTrace.spans.filter((span: SpanRepresentation) => span.spanName !== spanName);

    MikroTrace.spans = spans;
    this.setParentContext(parentSpan);
  }

  /**
   * @description Closes all spans.
   *
   * Only use this sparingly and in relevant cases, such as
   * when you need to close all spans in case of an error.
   */
  public endAll(): void {
    MikroTrace.spans.forEach((spanRep: SpanRepresentation) => spanRep.reference.end());
    MikroTrace.spans = [];
    MikroTrace.traceId = getRandomBytes(32);
    this.setParentContext('');
  }
}
