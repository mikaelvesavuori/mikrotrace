import { SpanConfiguration, SpanInput } from '../interfaces/Span';
export declare class Span {
    private tracer;
    private configuration;
    constructor(input: SpanInput);
    private produceSpan;
    setAttribute(key: any, value: any): void;
    setAttributes(attributeObject: Record<string, any>): void;
    getConfiguration(): SpanConfiguration;
    end(): void;
}
