import test from 'ava';

import { MikroTrace } from '../src/index';

import { basicTracer } from '../testdata/tracer';

import event from '../testdata/event.json';
import context from '../testdata/context.json';

function setEnv() {
  process.env.AWS_REGION = 'eu-north-1';
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs16.x';
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

test.afterEach(() => MikroTrace.reset());

/**
 * POSITIVE TESTS
 */
test.serial('It should create a new span with blank service name', (t) => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '' });
  const span = tracer.start('My span');

  t.truthy(span);
});

test.serial('It should retain parent context across continue()-based use', (t) => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '', correlationId: 'abc123' });
  const c1 = tracer.getConfiguration();

  const continued = MikroTrace.continue();
  const c2 = continued.getConfiguration();

  t.is(c1.parentContext, c2.parentContext);
});

test.serial('It should retain trace ID across continue()-based use', (t) => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '', correlationId: 'abc123' });
  const c1 = tracer.getConfiguration();

  const continued = MikroTrace.continue();
  const c2 = continued.getConfiguration();

  t.is(c1.traceId, c2.traceId);
});

test.serial('It should enrich the tracer post-initialization with service name', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ serviceName: 'My new service' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  t.deepEqual(config, {
    serviceName: 'My new service',
    spans: [],
    correlationId: '',
    parentContext: ''
  });
});

test.serial('It should enrich the tracer post-initialization with correlation ID', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ correlationId: 'abc123' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  t.deepEqual(config, {
    serviceName: 'My service',
    spans: [],
    correlationId: 'abc123',
    parentContext: ''
  });
});

test.serial('It should enrich the tracer post-initialization with parent context', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ parentContext: 'qwerty' });

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  t.deepEqual(config, {
    serviceName: 'My service',
    spans: [],
    correlationId: '',
    parentContext: 'qwerty'
  });
});

test.serial('It should create a new span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');

  t.truthy(span);
});

test.serial('It should set custom static metadata', (t) => {
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
    runtime: 'AWS_Lambda_nodejs16.x',
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
  t.true(configuration['startTime'] !== null);
  t.true(configuration['timestamp'] !== null);
  t.true(configuration['timestampEpoch'] !== null);
  t.true(configuration['spanId'] !== null);
  t.true(configuration['traceId'] !== null);

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  t.deepEqual(configuration, expected);

  clearEnv();
});

test.serial('It should get the configuration of a new span with AWS metadata', (t) => {
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
    runtime: 'AWS_Lambda_nodejs16.x',
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
  t.true(configuration['startTime'] !== null);
  t.true(configuration['timestamp'] !== null);
  t.true(configuration['timestampEpoch'] !== null);
  t.true(configuration['spanId'] !== null);
  t.true(configuration['traceId'] !== null);

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  t.deepEqual(configuration, expected);

  clearEnv();
});

test.serial('It should get the configuration of a new span without any AWS metadata', (t) => {
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
  t.true(configuration['startTime'] !== null);
  t.true(configuration['timestamp'] !== null);
  t.true(configuration['timestampEpoch'] !== null);
  t.true(configuration['spanId'] !== null);
  t.true(configuration['traceId'] !== null);

  // Drop dynamic fields for test validation
  delete configuration['startTime'];
  delete configuration['timestamp'];
  delete configuration['timestampEpoch'];
  delete configuration['spanId'];
  delete configuration['traceId'];

  t.deepEqual(configuration, expected);
});

test.serial('It should create a nested span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My outer span');
  const innerSpan = tracer.start('My inner span');

  const id = span.getConfiguration().spanId;
  const parentId = innerSpan.getConfiguration().spanParentId;

  innerSpan.end();
  span.end();

  t.is(parentId, id);
});

test.serial('It should end a span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.end();
  const isEnded = span.getConfiguration().isEnded;
  t.deepEqual(isEnded, true);
});

test.serial('It should remove a span', (t) => {
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

  t.deepEqual(config, expected);
});

test.serial('It should end all spans', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.start('My extra span');
  tracer.endAll();

  const config: Record<string, any> = tracer.getConfiguration();
  delete config['traceId'];

  t.deepEqual(config, basicTracer);
});

test.serial('It should set the parent context', (t) => {
  const expected = 'My custom-set context';

  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');
  tracer.setParentContext(expected);
  const context = tracer.getConfiguration().parentContext;
  span.end();
  innerSpan.end();
  const endingContext = tracer.getConfiguration().parentContext;

  t.is(context, expected);
  t.is(endingContext, '');
});

test.serial('It should set the parent span name to an existing span', (t) => {
  const expected = 'My span';

  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start(expected);
  const innerSpan = tracer.start('My inner span', expected);

  span.end();
  innerSpan.end();

  t.deepEqual(innerSpan.getConfiguration().spanParent, expected);
});

test.serial('It should set the correlation ID post-initialization', (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.setCorrelationId(expected);
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test.serial('It should set the correlation ID at the time of initialization', (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ correlationId: expected, serviceName: 'My service' });
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test.serial('It should set a single custom attribute', (t) => {
  const expected = 'some value';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttribute('key', expected);
  const config = span.getConfiguration();
  const { attributes } = config;
  span.end();

  t.is(attributes['key'], expected);
});

test.serial('It should set multiple custom attributes', (t) => {
  const expected = {
    something: 123,
    someKey: 'someValue'
  };

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttributes(expected);
  const config = span.getConfiguration();
  const { attributes } = config;

  t.deepEqual(attributes, expected);
});

test.serial('It should propagate the trace ID to any child spans', (t) => {
  const tracer = MikroTrace.start();

  const span = tracer.start('First span');
  const firstId = span.getConfiguration().traceId;

  const span2 = tracer.start('Second span');
  const secondId = span2.getConfiguration().traceId;

  span2.end();
  span.end();

  t.is(firstId, secondId);
});

test.serial(
  'It should get a new trace ID for each call to the "start()" method if using the "forceNewTraceId" option',
  (t) => {
    const tracer = MikroTrace.start();

    const span = tracer.start('First span');
    const firstId = span.getConfiguration().traceId;
    span.end();

    // @ts-ignore
    MikroTrace.start({});
    const span2 = tracer.start('Second span');
    const secondId = span2.getConfiguration().traceId;
    span2.end();

    t.not(firstId, secondId);
  }
);

test.serial('It should produce valid content for a non-sampled W3C "traceheader" header', (t) => {
  const tracer = MikroTrace.start();
  tracer.setSamplingRate(0);
  const span = tracer.start('First span');

  const header = tracer.getTraceHeader(span.getConfiguration());
  const [version, traceId, parentId, traceFlags] = header.split('-');

  span.end();

  tracer.setSamplingRate(100);

  t.is(version, '00');
  t.is(traceId.length, 32);
  t.is(parentId.length, 16);
  t.is(traceFlags, '00');
});

test.serial('It should produce valid content for a sampled W3C "traceheader" header', (t) => {
  const tracer = MikroTrace.start();
  tracer.setSamplingRate(100);
  const span = tracer.start('First span');
  const innerSpan = tracer.start('Second span');

  const header = tracer.getTraceHeader(span.getConfiguration());
  const [version, traceId, parentId, traceFlags] = header.split('-');

  innerSpan.end();
  span.end();

  t.is(version, '00');
  t.is(traceId.length, 32);
  t.is(parentId.length, 16);
  t.is(traceFlags, '01');
});

test.serial('It should set the debug sampling rate through an environment variable', (t) => {
  const expected = 0.5;
  process.env.MIKROTRACE_SAMPLE_RATE = `${expected}`;

  MikroTrace.reset(); // Needed as `initSampleLevel()` is only run at init-time
  const tracer = MikroTrace.start();
  // @ts-ignore
  const result = tracer.setSamplingRate();
  t.is(result, expected);

  // Reset
  tracer.setSamplingRate(100);
  process.env.MIKROTRACE_SAMPLE_RATE = undefined;
});

test.serial('It should return the current trace sampling rate when given a string value', (t) => {
  const tracer = MikroTrace.start();
  const expected = 100;
  // @ts-ignore
  const newSamplingRate = tracer.setSamplingRate('10273124');
  t.is(newSamplingRate, expected);
});

test.serial('It should return the current trace sampling rate when given an object value', (t) => {
  const tracer = MikroTrace.start();
  const expected = 100;
  // @ts-ignore
  const newSamplingRate = tracer.setSamplingRate({ asdf: 123 });
  t.is(newSamplingRate, expected);
});

test.serial(
  'It should set a new trace sampling rate when given a number between 0 and 100',
  (t) => {
    const tracer = MikroTrace.start();
    const expected = 5;
    const newSamplingRate = tracer.setSamplingRate(expected);
    t.is(newSamplingRate, expected);
  }
);

test.serial('It should set the trace sampling rate to 0 when given a number lower than 0', (t) => {
  const tracer = MikroTrace.start();
  const expected = 0;
  const newSamplingRate = tracer.setSamplingRate(-4);
  t.is(newSamplingRate, expected);
});

test.serial(
  'It should set the trace sampling rate to 100 when given a number higher than than 100',
  (t) => {
    const tracer = MikroTrace.start();
    const expected = 100;
    const newSamplingRate = tracer.setSamplingRate(10273124);
    t.is(newSamplingRate, expected);
  }
);

test.serial('It should have all logs being sampled at init time', (t) => {
  const tracer = MikroTrace.start();
  const expected = true;
  const sampling = tracer.isTraceSampled();
  t.is(sampling, expected);
});

test.serial('It should not sample logs when setting the sampling rate to 0', (t) => {
  const tracer = MikroTrace.start();
  const expected = false;
  tracer.setSamplingRate(0);
  tracer.start('My span');
  const sampling = tracer.isTraceSampled();
  t.is(sampling, expected);
});

/**
 * NEGATIVE TESTS
 */

test.serial(
  'It should throw a MissingSpanNameError if trying to create a span without a name',
  (t) => {
    const error: any = t.throws(() => {
      const tracer = MikroTrace.start({ serviceName: 'My service' });
      // @ts-ignore
      tracer.start();
    });

    t.is(error.name, 'MissingSpanNameError');
  }
);

test.serial(
  'It should throw a MissingParentSpanError if trying to make a nested span using a non-existent span',
  (t) => {
    const error: any = t.throws(() => {
      const tracer = MikroTrace.start({ serviceName: 'My service' });
      const span = tracer.start('My span');
      const innerSpan = tracer.start('My inner span', 'DoesNotExist');
      innerSpan.end();
      span.end();
    });

    t.is(error.name, 'MissingParentSpanError');
  }
);

test.serial(
  'It should throw a SpanAlreadyExistsError if trying to make a nested span using a non-existent span',
  (t) => {
    const error: any = t.throws(() => {
      const tracer = MikroTrace.start({ serviceName: 'My service' });
      const span = tracer.start('My span');
      const innerSpan = tracer.start('My span', 'DoesNotExist');
      innerSpan.end();
      span.end();
    });

    t.is(error.name, 'SpanAlreadyExistsError');
  }
);
