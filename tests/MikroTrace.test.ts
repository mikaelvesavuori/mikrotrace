import { afterEach, test, expect } from 'vitest';

import { MikroTrace } from '../src/index.js';

import { basicTracer } from '../testdata/tracer.js';

import event from '../testdata/event.json';
import context from '../testdata/context.json';
import { MissingSpanNameError, SpanAlreadyExistsError } from '../src/application/errors/errors.js';

function setEnv() {
  process.env.AWS_REGION = 'eu-north-1';
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
  process.env.AWS_LAMBDA_FUNCTION_NAME = 'TestFunction';
  process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '512';
  process.env.AWS_LAMBDA_FUNCTION_VERSION = '$LATEST';
}

function clearEnv() {
  process.env.AWS_REGION = '';
  process.env.AWS_EXECUTION_ENV = '';
  process.env.AWS_LAMBDA_FUNCTION_NAME = '';
  process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '';
  process.env.AWS_LAMBDA_FUNCTION_VERSION = '';
}

afterEach(() => MikroTrace.reset());

/**
 * POSITIVE TESTS
 */
test('It should create a new span with blank service name', () => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '' });
  const span = tracer.start('My span');

  expect(span).toBeTruthy();
});

test('It should retain parent context across continue()-based use', () => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '', correlationId: 'abc123' });
  const c1 = tracer.getConfiguration();

  const continued = MikroTrace.continue();
  const c2 = continued.getConfiguration();

  expect(c1.parentContext).toBe(c2.parentContext);
});

test('It should retain trace ID across continue()-based use', () => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '', correlationId: 'abc123' });
  const c1 = tracer.getConfiguration();

  const continued = MikroTrace.continue();
  const c2 = continued.getConfiguration();

  expect(c1.traceId).toBe(c2.traceId);
});

test('It should enrich the tracer post-initialization with service name', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ serviceName: 'My new service' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  expect(config).toMatchObject({
    serviceName: 'My new service',
    spans: [],
    correlationId: '',
    parentContext: ''
  });
});

test('It should enrich the tracer post-initialization with correlation ID', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ correlationId: 'abc123' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  expect(config).toMatchObject({
    serviceName: 'My service',
    spans: [],
    correlationId: 'abc123',
    parentContext: ''
  });
});

test('It should enrich the tracer post-initialization with parent context', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ parentContext: 'qwerty' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  expect(config).toMatchObject({
    serviceName: 'My service',
    spans: [],
    correlationId: '',
    parentContext: 'qwerty'
  });
});

test('It should create a new span', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');

  expect(span).toBeTruthy();
});

test('It should set custom static metadata', () => {
  setEnv();

  const expected = {
    accountId: '123412341234',
    attributes: {},
    correlationId: '6c933bd2-9535-45a8-b09c-84d00b4f50cc',
    dataSensitivity: 'proprietary',
    domain: 'MyDomain',
    durationMs: 0,
    functionMemorySize: '1024',
    functionName: 'somestack-FunctionName',
    functionVersion: '$LATEST',
    hostPlatform: 'aws',
    isEnded: false,
    owner: 'MyCompany',
    region: 'eu-north-1',
    resource: '/functionName',
    runtime: 'AWS_Lambda_nodejs20.x',
    service: 'My service',
    spanName: 'My span',
    stage: 'shared',
    system: 'MySystem',
    tags: ['backend', 'typescript', 'api', 'serverless', 'my-service'],
    team: 'MyTeam',
    timestampRequest: '1657389598171',
    user: 'some user',
    version: 1,
    viewerCountry: 'SE'
  };

  const metadataConfig = {
    version: 1,
    hostPlatform: 'aws',
    owner: 'MyCompany',
    domain: 'MyDomain',
    system: 'MySystem',
    team: 'MyTeam',
    tags: ['backend', 'typescript', 'api', 'serverless', 'my-service'],
    dataSensitivity: 'proprietary'
  };

  const tracer = MikroTrace.start({ serviceName: 'My service', event, context, metadataConfig });
  const span = tracer.start('My span');
  const configuration: any = span.getConfiguration();

  // Check presence of dynamic fields
  expect(configuration['startTime']).toBeDefined();
  expect(configuration['timestamp']).toBeDefined();
  expect(configuration['timestampEpoch']).toBeDefined();
  expect(configuration['spanId']).toBeDefined();
  expect(configuration['traceId']).toBeDefined();

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  expect(configuration).toMatchObject(expected);

  clearEnv();
});

test('It should get the configuration of a new span with AWS metadata', () => {
  setEnv();

  const expected = {
    accountId: '123412341234',
    attributes: {},
    correlationId: '6c933bd2-9535-45a8-b09c-84d00b4f50cc',
    durationMs: 0,
    functionMemorySize: '1024',
    functionName: 'somestack-FunctionName',
    functionVersion: '$LATEST',
    isEnded: false,
    region: 'eu-north-1',
    resource: '/functionName',
    runtime: 'AWS_Lambda_nodejs20.x',
    service: 'My service',
    spanName: 'My span',
    stage: 'shared',
    timestampRequest: '1657389598171',
    user: 'some user',
    viewerCountry: 'SE'
  };

  const tracer = MikroTrace.start({ serviceName: 'My service', event, context });
  const span = tracer.start('My span');
  const configuration: any = span.getConfiguration();

  // Check presence of dynamic fields
  expect(configuration['startTime']).toBeDefined();
  expect(configuration['timestamp']).toBeDefined();
  expect(configuration['timestampEpoch']).toBeDefined();
  expect(configuration['spanId']).toBeDefined();
  expect(configuration['traceId']).toBeDefined();

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  expect(configuration).toMatchObject(expected);

  clearEnv();
});

test('It should get the configuration of a new span without any AWS metadata', () => {
  const expected = {
    attributes: {},
    durationMs: 0,
    isEnded: false,
    service: 'My service',
    spanName: 'My span'
  };

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  const configuration: any = span.getConfiguration();

  // Check presence of dynamic fields
  expect(configuration['startTime']).toBeDefined();
  expect(configuration['timestamp']).toBeDefined();
  expect(configuration['timestampEpoch']).toBeDefined();
  expect(configuration['spanId']).toBeDefined();
  expect(configuration['traceId']).toBeDefined();

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  expect(configuration).toMatchObject(expected);
});

test('It should create a nested span', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My outer span');
  const innerSpan = tracer.start('My inner span');

  const id = span.getConfiguration().spanId;
  const parentId = innerSpan.getConfiguration().spanParentId;

  innerSpan.end();
  span.end();

  expect(parentId).toBe(id);
});

test('It should end a span', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.end();
  const isEnded = span.getConfiguration().isEnded;

  expect(isEnded).toBe(true);
});

test('It should remove a span', () => {
  const expected = {
    correlationId: '',
    parentContext: '',
    serviceName: 'My service',
    spans: []
  };

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.removeSpan('My span');

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  expect(config).toMatchObject(expected);
});

test('It should end all spans', () => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.start('My extra span');
  tracer.endAll();

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  expect(config).toMatchObject(basicTracer);
});

test('It should set the parent context', () => {
  const expected = 'My custom-set context';

  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');
  tracer.setParentContext(expected);
  const context = tracer.getConfiguration().parentContext;
  span.end();
  innerSpan.end();
  const endingContext = tracer.getConfiguration().parentContext;

  expect(context).toBe(expected);
  expect(endingContext).toBe('');
});

test('It should set the parent span name to an existing span', () => {
  const expected = 'My span';

  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start(expected);
  const innerSpan = tracer.start('My inner span', expected);

  span.end();
  innerSpan.end();

  expect(innerSpan.getConfiguration().spanParent).toMatchObject(expected);
});

test('It should set the correlation ID post-initialization', () => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.setCorrelationId(expected);
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  expect(correlationId).toBe(expected);
});

test('It should set the correlation ID at the time of initialization', () => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ correlationId: expected, serviceName: 'My service' });
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  expect(correlationId).toBe(expected);
});

test('It should set a single custom attribute', () => {
  const expected = 'some value';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttribute('key', expected);
  const config = span.getConfiguration();
  const { attributes } = config;
  span.end();

  expect(attributes['key']).toBe(expected);
});

test('It should set multiple custom attributes', () => {
  const expected = {
    something: 123,
    someKey: 'someValue'
  };

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttributes(expected);
  const config = span.getConfiguration();
  const { attributes } = config;

  expect(attributes).toMatchObject(expected);
});

test('It should propagate the trace ID to any child spans', () => {
  const tracer = MikroTrace.start();

  const span = tracer.start('First span');
  const firstId = span.getConfiguration().traceId;

  const span2 = tracer.start('Second span');
  const secondId = span2.getConfiguration().traceId;

  span2.end();
  span.end();

  expect(firstId).toBe(secondId);
});

test('It should get a new trace ID for each call to the "start()" method if using the "forceNewTraceId" option', () => {
  const tracer = MikroTrace.start();

  const span = tracer.start('First span');
  const firstId = span.getConfiguration().traceId;
  span.end();

  // @ts-ignore
  MikroTrace.start({});
  const span2 = tracer.start('Second span');
  const secondId = span2.getConfiguration().traceId;
  span2.end();

  expect(firstId).not.toBe(secondId);
});

test('It should produce valid content for a non-sampled W3C "traceheader" header', () => {
  const tracer = MikroTrace.start();
  tracer.setSamplingRate(0);
  const span = tracer.start('First span');

  const header = tracer.getTraceHeader(span.getConfiguration());
  const [version, traceId, parentId, traceFlags] = header.split('-');

  span.end();

  tracer.setSamplingRate(100);

  expect(version).toBe('00');
  expect(traceId.length).toBe(32);
  expect(parentId.length).toBe(16);
  expect(traceFlags).toBe('00');
});

test('It should produce valid content for a sampled W3C "traceheader" header', () => {
  const tracer = MikroTrace.start();
  tracer.setSamplingRate(100);
  const span = tracer.start('First span');
  const innerSpan = tracer.start('Second span');

  const header = tracer.getTraceHeader(span.getConfiguration());
  const [version, traceId, parentId, traceFlags] = header.split('-');

  innerSpan.end();
  span.end();

  expect(version).toBe('00');
  expect(traceId.length).toBe(32);
  expect(parentId.length).toBe(16);
  expect(traceFlags).toBe('01');
});

test('It should set the debug sampling rate through an environment variable', () => {
  const expected = 0.5;
  process.env.MIKROTRACE_SAMPLE_RATE = `${expected}`;

  MikroTrace.reset(); // Needed as `initSampleLevel()` is only run at init-time
  const tracer = MikroTrace.start();
  // @ts-ignore
  const result = tracer.setSamplingRate();
  expect(result).toBe(expected);

  // Reset
  tracer.setSamplingRate(100);
  process.env.MIKROTRACE_SAMPLE_RATE = undefined;
});

test('It should return the current trace sampling rate when given a string value', () => {
  const tracer = MikroTrace.start();
  const expected = 100;
  // @ts-ignore
  const newSamplingRate = tracer.setSamplingRate('10273124');
  expect(newSamplingRate).toBe(expected);
});

test('It should return the current trace sampling rate when given an object value', () => {
  const tracer = MikroTrace.start();
  const expected = 100;
  // @ts-ignore
  const newSamplingRate = tracer.setSamplingRate({ asdf: 123 });
  expect(newSamplingRate).toBe(expected);
});

test('It should set a new trace sampling rate when given a number between 0 and 100', () => {
  const tracer = MikroTrace.start();
  const expected = 5;
  const newSamplingRate = tracer.setSamplingRate(expected);
  expect(newSamplingRate).toBe(expected);
});

test('It should set the trace sampling rate to 0 when given a number lower than 0', () => {
  const tracer = MikroTrace.start();
  const expected = 0;
  const newSamplingRate = tracer.setSamplingRate(-4);
  expect(newSamplingRate).toBe(expected);
});

test('It should set the trace sampling rate to 100 when given a number higher than than 100', () => {
  const tracer = MikroTrace.start();
  const expected = 100;
  const newSamplingRate = tracer.setSamplingRate(10273124);
  expect(newSamplingRate).toBe(expected);
});

test('It should have all logs being sampled at init time', () => {
  const tracer = MikroTrace.start();
  const expected = true;
  const sampling = tracer.isTraceSampled();
  expect(sampling).toBe(expected);
});

test('It should not sample logs when setting the sampling rate to 0', () => {
  const tracer = MikroTrace.start();
  const expected = false;
  tracer.setSamplingRate(0);
  tracer.start('My span');
  const sampling = tracer.isTraceSampled();
  expect(sampling).toBe(expected);
});

/**
 * NEGATIVE TESTS
 */

test('It should throw a MissingSpanNameError if trying to create a span without a name', () => {
  expect(() => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    // @ts-ignore
    tracer.start();
  }).toThrow(MissingSpanNameError);
});

test('It should throw a MissingParentSpanError if trying to make a nested span using a non-existent span', () => {
  expect(() => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    const span = tracer.start('My span');
    const innerSpan = tracer.start('My inner span', 'DoesNotExist');
    innerSpan.end();
    span.end();
  }).toThrow();
});

test('It should throw a SpanAlreadyExistsError if trying to make a nested span using a non-existent span', () => {
  expect(() => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    const span = tracer.start('My span');
    const innerSpan = tracer.start('My span', 'DoesNotExist');
    innerSpan.end();
    span.end();
  }).toThrow(SpanAlreadyExistsError);
});
