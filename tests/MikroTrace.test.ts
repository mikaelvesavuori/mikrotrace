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

/**
 * POSITIVE TESTS
 */
test.serial('It should be able to create a new span with blank service name ', (t) => {
  MikroTrace.start({ serviceName: 'MyService' });
  const tracer = MikroTrace.start({ serviceName: '' });
  const span = tracer.start('My span');

  // @ts-ignore
  t.truthy(span);
});

test.serial('It should be able to enrich the tracer post-initialization with service name', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.enrich({ serviceName: 'My new service' });

  t.deepEqual(tracer.getConfiguration(), {
    serviceName: 'My new service',
    spans: [],
    correlationId: '',
    parentContext: ''
  });
});

test.serial(
  'It should be able to enrich the tracer post-initialization with correlation ID',
  (t) => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    MikroTrace.enrich({ correlationId: 'abc123' });

    t.deepEqual(tracer.getConfiguration(), {
      serviceName: 'My service',
      spans: [],
      correlationId: 'abc123',
      parentContext: ''
    });
  }
);

test.serial(
  'It should be able to enrich the tracer post-initialization with parent context',
  (t) => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    MikroTrace.enrich({ parentContext: 'qwerty' });

    t.deepEqual(tracer.getConfiguration(), {
      serviceName: 'My service',
      spans: [],
      correlationId: '',
      parentContext: 'qwerty'
    });
  }
);

test.serial('It should be able to create a new span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');

  // @ts-ignore
  t.truthy(span);
});

test.serial('It should be able to get the configuration of a new span with AWS metadata', (t) => {
  setEnv();
  const tracer = MikroTrace.start({ serviceName: 'My service', event, context });
  const span = tracer.start('My span');
  const configuration = span.getConfiguration();

  // Check presence of dynamic fields
  t.true(configuration['startTime'] !== null);
  t.true(configuration['timestamp'] !== null);
  t.true(configuration['timestampEpoch'] !== null);
  t.true(configuration['spanId'] !== null);
  t.true(configuration['traceId'] !== null);

  // Drop dynamic fields for test validation
  // @ts-ignore
  delete configuration['startTime'];
  // @ts-ignore
  delete configuration['timestamp'];
  // @ts-ignore
  delete configuration['timestampEpoch'];
  // @ts-ignore
  delete configuration['spanId'];
  // @ts-ignore
  delete configuration['traceId'];

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

  // @ts-ignore
  t.deepEqual(configuration, expected);

  clearEnv();
});

test.serial(
  'It should be able to get the configuration of a new span without any AWS metadata',
  (t) => {
    const tracer = MikroTrace.start({ serviceName: 'My service' });
    const span = tracer.start('My span');
    const configuration = span.getConfiguration();

    // Check presence of dynamic fields
    t.true(configuration['startTime'] !== null);
    t.true(configuration['timestamp'] !== null);
    t.true(configuration['timestampEpoch'] !== null);
    t.true(configuration['spanId'] !== null);
    t.true(configuration['traceId'] !== null);

    // Drop dynamic fields for test validation
    // @ts-ignore
    delete configuration['startTime'];
    // @ts-ignore
    delete configuration['timestamp'];
    // @ts-ignore
    delete configuration['timestampEpoch'];
    // @ts-ignore
    delete configuration['spanId'];
    // @ts-ignore
    delete configuration['traceId'];

    const expected = {
      attributes: {},
      durationMs: 0,
      isEnded: false,
      service: 'My service',
      spanName: 'My span'
    };

    // @ts-ignore
    t.deepEqual(configuration, expected);
  }
);

test.serial('It should be able to create a nested span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');

  const id = span.getConfiguration().spanId;
  const parentId = innerSpan.getConfiguration().spanParentId;

  innerSpan.end();
  span.end();

  t.is(parentId, id);
});

test.serial('It should be able to end a span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.end();
  const isEnded = span.getConfiguration().isEnded;
  t.deepEqual(isEnded, true);
});

test.serial('It should be able to remove a span', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.removeSpan('My span');

  t.deepEqual(tracer.getConfiguration(), {
    correlationId: '',
    parentContext: 'My span',
    serviceName: 'My service',
    spans: []
  });
});

test.serial('It should be able to end all spans', (t) => {
  const tracer = MikroTrace.start({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.start('My extra span');
  tracer.endAll();
  t.deepEqual(tracer.getConfiguration(), basicTracer);
});

test.serial('It should be able to set the parent context', (t) => {
  const expected = 'My inner span';
  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');
  tracer.setParentContext(expected);

  span.end();
  innerSpan.end();

  const _basicTracer = JSON.parse(JSON.stringify(basicTracer));
  _basicTracer.parentContext = expected;

  t.deepEqual(tracer.getConfiguration(), _basicTracer);
});

test.serial('It should be able to set the parent span name to an existing span', (t) => {
  const expected = 'My span';
  const tracer = MikroTrace.start({ serviceName: 'My service' });

  const span = tracer.start(expected);
  const innerSpan = tracer.start('My inner span', expected);

  span.end();
  innerSpan.end();

  t.deepEqual(innerSpan.getConfiguration().spanParent, expected);
});

test.serial('It should be able to set the correlation ID post-initialization', (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  MikroTrace.setCorrelationId(expected);
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test.serial('It should be able to set the correlation ID at the time of initialization', (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = MikroTrace.start({ correlationId: expected, serviceName: 'My service' });
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test.serial('It should be able to set a single custom attribute', (t) => {
  const expected = 'some value';

  const tracer = MikroTrace.start({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttribute('key', expected);
  const config = span.getConfiguration();
  const { attributes } = config;

  t.is(attributes['key'], expected);
});

test.serial('It should be able to set multiple custom attributes', (t) => {
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

test.serial('It should clear out metadata and other values between instances', (t) => {
  const expected = undefined;

  const tracer = MikroTrace.start({ serviceName: 'My service', event, context });
  const span = tracer.start('My span');
  MikroTrace.start({ serviceName: 'My service 2' });
  const span2 = tracer.start('New span');
  const configuration = span2.getConfiguration();
  span2.end();
  span.end();

  t.is(configuration.accountId, expected);
});
