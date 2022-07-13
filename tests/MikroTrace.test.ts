import test from 'ava';

import { MikroTrace } from '../src/index';

/**
 * POSITIVE TESTS
 */
test('It should be able to create a new span with blank service name ', async (t) => {
  const tracer = new MikroTrace({ serviceName: '' });
  const span = tracer.start('My span');

  // @ts-ignore
  t.truthy(span);
});

test('It should be able to create a new span', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');

  // @ts-ignore
  t.truthy(span);
});

test('It should be able to get the configuration of a new span', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');
  const configuration = span.getConfiguration();

  // Check presence of dynamic fields
  t.true(configuration['startTime'] !== null);
  t.true(configuration['endTime'] !== null);
  t.true(configuration['timestamp'] !== null);
  t.true(configuration['spanId'] !== null);
  t.true(configuration['traceId'] !== null);

  // Drop dynamic fields for test validation
  // @ts-ignore
  delete configuration['startTime'];
  // @ts-ignore
  delete configuration['endTime'];
  // @ts-ignore
  delete configuration['timestamp'];
  // @ts-ignore
  delete configuration['spanId'];
  // @ts-ignore
  delete configuration['traceId'];

  const expected = {
    attributes: {},
    correlationId: '',
    durationMs: 0,
    isEnded: false,
    name: 'My span',
    service: 'My service',
    spanName: 'My span',
    spanParent: undefined,
    spanParentId: ''
  };

  // @ts-ignore
  t.deepEqual(configuration, expected);
});

test('It should be able to create a nested span', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');

  const id = span.getConfiguration().spanId;
  const parentId = innerSpan.getConfiguration().spanParentId;

  innerSpan.end();
  span.end();

  t.is(parentId, id);
});

test('It should be able to end a span', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.end();
  const isEnded = span.getConfiguration().isEnded;
  t.deepEqual(isEnded, true);
});

test('It should be able to remove a span', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  tracer.removeSpan('My span');
  t.deepEqual(JSON.stringify(tracer), `{"parentContext":"","serviceName":"My service","spans":[]}`);
});

test('It should be able to end all spans', async (t) => {
  const tracer = new MikroTrace({ serviceName: 'My service' });
  tracer.start('My span');
  tracer.start('My extra span');
  tracer.endAll();
  t.deepEqual(JSON.stringify(tracer), `{"parentContext":"","serviceName":"My service","spans":[]}`);
});

test('It should be able to set the parent context', async (t) => {
  const expected = 'My inner span';
  const tracer = new MikroTrace({ serviceName: 'My service' });

  const span = tracer.start('My span');
  const innerSpan = tracer.start('My inner span');
  tracer.setParentContext(expected);

  span.end();
  innerSpan.end();

  t.deepEqual(
    JSON.stringify(tracer),
    `{"parentContext":"My inner span","serviceName":"My service","spans":[]}`
  );
});

test('It should be able to set the parent span name to an existing span', async (t) => {
  const expected = 'My span';
  const tracer = new MikroTrace({ serviceName: 'My service' });

  const span = tracer.start(expected);
  const innerSpan = tracer.start('My inner span', expected);

  span.end();
  innerSpan.end();

  t.deepEqual(innerSpan.getConfiguration().spanParent, expected);
});

test('It should be able to set the correlation ID post-initialization', async (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = new MikroTrace({ serviceName: 'My service' });
  tracer.setCorrelationId(expected);
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test('It should be able to set the correlation ID at the time of initialization', async (t) => {
  const expected = '1234-asdf-qwerty-foo-BAR';

  const tracer = new MikroTrace({ correlationId: expected, serviceName: 'My service' });
  const span = tracer.start('My span');
  const config = span.getConfiguration();
  const { correlationId } = config;

  t.is(correlationId, expected);
});

test('It should be able to set a single custom attribute', async (t) => {
  const expected = 'some value';

  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttribute('key', expected);
  const config = span.getConfiguration();
  const { attributes } = config;

  t.is(attributes['key'], expected);
});

test('It should be able to set multiple custom attributes', async (t) => {
  const expected = {
    something: 123,
    someKey: 'someValue'
  };

  const tracer = new MikroTrace({ serviceName: 'My service' });
  const span = tracer.start('My span');
  span.setAttributes(expected);
  const config = span.getConfiguration();
  const { attributes } = config;

  t.deepEqual(attributes, expected);
});

/**
 * NEGATIVE TESTS
 */

test('It should throw a MissingSpanNameError if trying to create a span without a name', async (t) => {
  const error: any = t.throws(() => {
    const tracer = new MikroTrace({ serviceName: 'My service' });
    // @ts-ignore
    tracer.start();
  });

  t.is(error.name, 'MissingSpanNameError');
});

test('It should throw a MissingParentSpanError if trying to make a nested span using a non-existent span', async (t) => {
  const error: any = t.throws(() => {
    const tracer = new MikroTrace({ serviceName: 'My service' });
    const span = tracer.start('My span');
    const innerSpan = tracer.start('My inner span', 'DoesNotExist');
    innerSpan.end();
    span.end();
  });

  t.is(error.name, 'MissingParentSpanError');
});

test('It should throw a SpanAlreadyExistsError if trying to make a nested span using a non-existent span', async (t) => {
  const error: any = t.throws(() => {
    const tracer = new MikroTrace({ serviceName: 'My service' });
    const span = tracer.start('My span');
    const innerSpan = tracer.start('My span', 'DoesNotExist');
    innerSpan.end();
    span.end();
  });

  t.is(error.name, 'SpanAlreadyExistsError');
});
