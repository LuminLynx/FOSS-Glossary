const test = require('node:test');
const assert = require('node:assert/strict');
const { formatAjvError } = require('../utils/validation');

// Tests for formatAjvError with array of errors (exportTerms.js style)
test('formatAjvError: handles empty array', () => {
  const result = formatAjvError([]);
  assert.equal(result, 'Unknown validation error');
});

test('formatAjvError: handles null', () => {
  const result = formatAjvError(null);
  assert.equal(result, 'Unknown validation error');
});

test('formatAjvError: handles undefined', () => {
  const result = formatAjvError(undefined);
  assert.equal(result, 'Unknown validation error');
});

test('formatAjvError: formats single error in array', () => {
  const errors = [
    {
      instancePath: '/terms/0',
      message: 'must have required property "slug"',
    },
  ];
  const result = formatAjvError(errors);
  assert.equal(result, '/terms/0 must have required property "slug"');
});

test('formatAjvError: formats multiple errors in array', () => {
  const errors = [
    {
      instancePath: '/terms/0',
      message: 'must have required property "slug"',
    },
    {
      instancePath: '/terms/1',
      message: 'must be string',
    },
  ];
  const result = formatAjvError(errors);
  assert.equal(result, '/terms/0 must have required property "slug"; /terms/1 must be string');
});

test('formatAjvError: handles errors with empty instancePath', () => {
  const errors = [
    {
      instancePath: '',
      message: 'must have required property "terms"',
    },
  ];
  const result = formatAjvError(errors);
  assert.equal(result, '(root) must have required property "terms"');
});

// Tests for formatAjvError with single error object (validateTerms.js style)
test('formatAjvError: formats single error object with instancePath', () => {
  const error = {
    instancePath: '/terms/0',
    message: 'must be string',
  };
  const result = formatAjvError(error);
  assert.equal(result, '/terms/0 must be string');
});

test('formatAjvError: formats single error object without instancePath', () => {
  const error = {
    instancePath: '',
    message: 'must have required property "terms"',
  };
  const result = formatAjvError(error);
  assert.equal(result, '(root) must have required property "terms"');
});

test('formatAjvError: formats additionalProperties error', () => {
  const error = {
    keyword: 'additionalProperties',
    instancePath: '/terms/0',
    params: {
      additionalProperty: 'extra_field',
    },
    message: 'must NOT have additional properties',
  };
  const result = formatAjvError(error);
  assert.equal(result, "/terms/0 has unexpected property 'extra_field'");
});

test('formatAjvError: formats required error', () => {
  const error = {
    keyword: 'required',
    instancePath: '/terms/0',
    params: {
      missingProperty: 'slug',
    },
    message: "must have required property 'slug'",
  };
  const result = formatAjvError(error);
  assert.equal(result, "/terms/0 missing required property 'slug'");
});

test('formatAjvError: formats minLength error', () => {
  const error = {
    keyword: 'minLength',
    instancePath: '/terms/0/slug',
    params: {
      limit: 1,
    },
    message: 'must NOT have fewer than 1 characters',
  };
  const result = formatAjvError(error);
  assert.equal(result, '/terms/0/slug must NOT have fewer than 1 characters (minLength 1)');
});

test('formatAjvError: handles error without message', () => {
  const error = {
    instancePath: '/terms/0',
  };
  const result = formatAjvError(error);
  assert.equal(result, '/terms/0 validation error');
});

test('formatAjvError: handles error with null params', () => {
  const error = {
    keyword: 'additionalProperties',
    instancePath: '/terms/0',
    params: null,
    message: 'must NOT have additional properties',
  };
  const result = formatAjvError(error);
  assert.equal(result, '/terms/0 must NOT have additional properties');
});
