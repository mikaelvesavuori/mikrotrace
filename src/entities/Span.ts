import { randomUUID } from 'crypto';

import { MikroTrace } from './MikroTrace';
import { SpanConfiguration, SpanInput } from '../interfaces/Span';

/**
 * @description Produces valid invariants of the actual `Span`.
 * Do not use this directly, only through MikroTrace.
 */
export class Span {
  private tracer: MikroTrace;
  private configuration: SpanConfiguration;

  constructor(input: SpanInput) {
    const { tracer } = input;
    this.tracer = tracer;
    this.configuration = this.produceSpan(input);
  }

  /**
   * @description Produce a `Span`.
   */
  private produceSpan(input: SpanInput): SpanConfiguration {
    const {
      spanName,
      parentSpanName,
      parentSpanId,
      parentTraceId,
      correlationId,
      service,
      staticMetadata,
      dynamicMetadata
    } = input;
    const timeNow = Date.now();

    return this.filterMetadata({
      ...dynamicMetadata,
      ...staticMetadata,
      timestamp: new Date(timeNow).toISOString(),
      timestampEpoch: `${timeNow}`,
      startTime: `${timeNow}`,
      durationMs: 0,
      spanName,
      spanParent: parentSpanName,
      spanParentId: parentSpanId || '',
      spanId: randomUUID(),
      traceId: parentTraceId,
      attributes: {},
      correlationId: correlationId || '',
      service,
      isEnded: false
    });
  }

  /**
   * @description Set a single attribute by key and value.
   */
  public setAttribute(key: any, value: any): void {
    this.configuration['attributes'][key] = value;
  }

  /**
   * @description Set one or more attributes through an object.
   * Merges and replaces any existing keys.
   */
  public setAttributes(attributeObject: Record<string, any>): void {
    const combinedAttributes = Object.assign(this.configuration['attributes'], attributeObject);
    this.configuration['attributes'] = combinedAttributes;
  }

  /**
   * @description Get the span's full configuration object.
   */
  public getConfiguration(): SpanConfiguration {
    return this.configuration;
  }

  /**
   * @description End the trace. Perform some configuration modification
   * to ensure logs looks right and don't contain unnecessary information.
   * Finally, call the tracer so it can remove its representation of this span.
   */
  public end(): void {
    const config = this.configuration;

    config['durationMs'] = Math.floor(Date.now() - parseInt(config.startTime));
    config['isEnded'] = true;

    // @ts-ignore
    delete config['startTime']; // Not needed in logs
    // @ts-ignore
    if (!config['spanParentId']) delete config['spanParentId']; // Ensure this is completely erased if just empty

    // This ensures we get correct logs output
    process.stdout.write(JSON.stringify(this.sortOutput(config)) + '\n');

    // The tracer no longer needs to care about this span
    this.tracer.removeSpan(config['spanName']);
  }

  /**
   * @description Alphabetically sort the fields in the log object.
   */
  private sortOutput(input: Record<string, any>) {
    const sortedOutput: any = {};

    Object.entries(input)
      .sort()
      .forEach(([key, value]) => (sortedOutput[key] = value));

    return sortedOutput;
  }

  /**
   * @description Filter metadata from empties.
   */
  private filterMetadata(metadata: Record<string, any>) {
    const filteredMetadata: any = {};

    Object.entries(metadata).forEach((entry: any) => {
      const [key, value] = entry;
      if (value || value === 0 || value === false) filteredMetadata[key] = value;
    });

    return filteredMetadata;
  }
}
