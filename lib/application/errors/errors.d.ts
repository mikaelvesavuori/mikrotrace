export declare class MissingParentSpanError extends Error {
    constructor(parentSpanName: string);
}
export declare class SpanAlreadyExistsError extends Error {
    constructor(spanName: string);
}
export declare class MissingSpanNameError extends Error {
    constructor();
}
