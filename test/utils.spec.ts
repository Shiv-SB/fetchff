import {
  isJSONSerializable,
  replaceUrlPathParams,
  appendQueryParams,
  delayInvocation,
  processHeaders,
  sortObject,
  sanitizeObject,
  isObject,
  shallowSerialize,
  isAbsoluteUrl,
} from '../src/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).File = class File {
  name: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_parts: any[], name: string, options: any = {}) {
    this.name = name;
    this.type = options.type || '';
  }
};

describe('Utils', () => {
  console.warn = jest.fn();

  afterEach((done) => {
    done();
  });

  describe('sanitizeObject()', () => {
    it('should remove dangerous properties from objects', () => {
      const input = {
        safe: 'value',
        __proto__: { polluted: true },
        constructor: 'unsafe',
        prototype: 'danger',
      };
      const output = sanitizeObject(input);

      expect(output).toEqual({ safe: 'value' });
      expect(Object.prototype.hasOwnProperty.call(output, '__proto__')).toBe(
        false,
      );
      expect(Object.prototype.hasOwnProperty.call(output, 'constructor')).toBe(
        false,
      );
      expect(Object.prototype.hasOwnProperty.call(output, 'prototype')).toBe(
        false,
      );
    });

    it('should return a new object reference', () => {
      const input = { a: 1, b: 2 };
      const output = sanitizeObject(input);

      expect(output).not.toBe(input); // Different reference
      expect(output).toEqual(input); // Same content
    });

    xit('should handle null and undefined inputs', () => {
      // @ts-expect-error Null and undefined are not objects
      expect(sanitizeObject(null)).toBeNull();
      // @ts-expect-error Null and undefined are not objects
      expect(sanitizeObject(undefined)).toBeUndefined();
    });

    xit('should handle array inputs without modification', () => {
      const input = [1, 2, 3];
      expect(sanitizeObject(input)).toEqual(input);
    });

    xit('should handle primitive inputs without modification', () => {
      // @ts-expect-error String, number, and boolean are not objects
      expect(sanitizeObject('string')).toBe('string');
      // @ts-expect-error String, number, and boolean are not objects
      expect(sanitizeObject(123)).toBe(123);
      // @ts-expect-error String, number, and boolean are not objects
      expect(sanitizeObject(true)).toBe(true);
    });

    it('should preserve all safe properties', () => {
      const date = new Date();
      const input = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: date,
        nullValue: null,
        undefinedValue: undefined,
      };

      const output = sanitizeObject(input);
      expect(output).toEqual(input);
    });

    it('should handle empty objects', () => {
      expect(sanitizeObject({})).toEqual({});
    });

    it('should not modify nested objects', () => {
      const input = {
        safe: 'value',
        nested: {
          __proto__: { polluted: true },
          safe: 'nested value',
        },
      };

      const output = sanitizeObject(input);

      // The top-level object is sanitized, but nested objects are not recursively sanitized
      expect(output).toEqual({
        safe: 'value',
        nested: {
          __proto__: { polluted: true },
          safe: 'nested value',
        },
      });
    });
  });

  describe('sortObject()', () => {
    it('should sort object keys alphabetically', () => {
      const input = { z: 1, a: 2, b: 3, c: 4 };
      const output = sortObject(input);

      const keys = Object.keys(output);
      expect(keys).toEqual(['a', 'b', 'c', 'z']);
    });

    it('should return a new object without modifying the original', () => {
      const input = { z: 1, a: 2 };
      const output = sortObject(input);

      expect(output).not.toBe(input); // Should be a different reference
      expect(input).toEqual({ z: 1, a: 2 }); // Original should remain unchanged
    });

    it('should preserve all property values', () => {
      const input = {
        b: 'string',
        a: 123,
        c: true,
        d: null,
        e: undefined,
        f: { nested: 'object' },
        g: [1, 2, 3],
      };
      const output = sortObject(input) as Record<string, unknown>;

      expect(output.a).toBe(123);
      expect(output.b).toBe('string');
      expect(output.c).toBe(true);
      expect(output.d).toBe(null);
      expect(output.e).toBe(undefined);
      expect(output.f).toEqual({ nested: 'object' });
      expect(output.g).toEqual([1, 2, 3]);
    });

    it('should handle empty objects', () => {
      const input = {};
      const output = sortObject(input);

      expect(output).toEqual({});
    });

    it('should handle objects with special characters in keys', () => {
      const input = { $key: 1, _key: 2, '123key': 3 };
      const output = sortObject(input);

      const keys = Object.keys(output);
      expect(keys).toEqual(['$key', '123key', '_key']);
    });

    it('should skip dangerous property names to prevent prototype pollution', () => {
      const input = {
        normal: 'safe',
        __proto__: { polluted: true },
      };
      const output = sortObject(input);

      expect(output).toEqual({ normal: 'safe' });
      expect(Object.prototype.hasOwnProperty.call(output, '__proto__')).toBe(
        false,
      );
      expect(Object.prototype.hasOwnProperty.call(output, 'constructor')).toBe(
        false,
      );
      expect(Object.prototype.hasOwnProperty.call(output, 'prototype')).toBe(
        false,
      );
    });

    it('should correctly sort unicode characters', () => {
      const input = { é: 1, à: 2, ç: 3, b: 4, a: 5 };
      const output = sortObject(input);

      const keys = Object.keys(output);
      // Note: The exact sort order may vary by JavaScript engine,
      // but generally alphabetical with unicode collation rules
      expect(keys.indexOf('a')).toBeLessThan(keys.indexOf('b'));
    });
  });

  describe('isObject()', () => {
    describe('falsey values should return false', () => {
      it('should return false for undefined', () => {
        expect(isObject(undefined)).toBe(false);
      });

      it('should return false for null', () => {
        expect(isObject(null)).toBe(false);
      });

      it('should return false for the number zero', () => {
        expect(isObject(0)).toBe(false);
      });

      it('should return false for an empty string', () => {
        expect(isObject('')).toBe(false);
      });
    });

    describe('literals should return false', () => {
      it('should return false for a string', () => {
        expect(isObject('foo')).toBe(false);
      });

      it('should return false for a number', () => {
        expect(isObject(123)).toBe(false);
      });

      it('should return false for a boolean', () => {
        expect(isObject(true)).toBe(false);
        expect(isObject(false)).toBe(false);
      });
    });

    describe('non-record-like objects should return false', () => {
      // Date objects should probably not return true
      it.skip('should return false for a Date object', () => {
        expect(isObject(new Date())).toBe(false);
      });

      // Arrays currently return true, but there are implementations which rely on this behaviour,
      // e.g. cache-manager
      it.skip('should return false for a non-empty array', () => {
        expect(isObject(['foo', 'bar'])).toBe(false);
      });
    });

    describe('record-like objects should return true', () => {
      it('should return true for an object with string keys', () => {
        expect(isObject({ foo: 'bar' })).toBe(true);
      });

      it('should expect an empty object to return true', () => {
        expect(isObject({})).toBe(true);
      });

      it('should return true for an object with a mix of valid key types', () => {
        const symbol: unique symbol = Symbol('foo!');
        expect(isObject({ foo: 'foo', 1: 'bar', [symbol]: 'baz' })).toBe(true);
      });

      it('should return true for nested objects', () => {
        const obj = {
          1: {
            2: {
              3: 'foo',
              4: 'bar',
            },
          },
        };
        expect(isObject(obj)).toBe(true);
      });
    });

    it('should return true for Request and Response objects', () => {
      expect(isObject(new Response())).toBe(true);
      expect(isObject(new Request('https://foo'))).toBe(true);
    });
  });

  describe('shallowSerialize()', () => {
    it('should serialize a simple object with string values', () => {
      const obj = { foo: 'bar', baz: 'qux' };
      const result = shallowSerialize(obj);
      // Order is not guaranteed, so check both possibilities
      expect(['foo:barbaz:qux', 'baz:quxfoo:bar']).toContain(result);
    });

    it('should serialize an object with number and boolean values', () => {
      const obj = { a: 1, b: true, c: false };
      const result = shallowSerialize(obj);
      // Order is not guaranteed
      expect([
        'a:1b:truec:false',
        'a:1c:falseb:true',
        'b:truea:1c:false',
        'b:truec:falsea:1',
        'c:falsea:1b:true',
        'c:falseb:truea:1',
      ]).toContain(result);
    });

    it('should serialize an object with undefined and null values', () => {
      const obj = { a: undefined, b: null };
      const result = shallowSerialize(obj);
      expect(['a:undefinedb:null', 'b:nulla:undefined']).toContain(result);
    });

    it('should not serialize inherited properties', () => {
      const proto = { inherited: 'value' };
      const obj = Object.create(proto);
      obj.own = 'ownValue';
      const result = shallowSerialize(obj);
      expect(result).toBe('own:ownValue');
    });

    it('should serialize an empty object as an empty string', () => {
      expect(shallowSerialize({})).toBe('');
    });

    it('should serialize an object with symbol keys as if they do not exist', () => {
      const sym = Symbol('sym');
      const obj = { foo: 'bar' };
      // @ts-expect-error Test case for non existant prop.
      obj[sym] = 'baz';
      const result = shallowSerialize(obj);
      expect(result).toBe('foo:bar');
    });

    it('should serialize an object with array and object values as their string representation', () => {
      const obj = { arr: [1, 2], obj: { nested: 'value' } };
      const result = shallowSerialize(obj);
      // [1,2] becomes '1,2', {nested:'value'} becomes '[object Object]'
      expect([
        'arr:1,2obj:[object Object]',
        'obj:[object Object]arr:1,2',
      ]).toContain(result);
    });

    it('should serialize keys with special characters', () => {
      const obj = { 'a-b': 1, 'c d': 2 };
      const result = shallowSerialize(obj);
      expect(['a-b:1c d:2', 'c d:2a-b:1']).toContain(result);
    });
  });

  describe('isJSONSerializable()', () => {
    describe('Body instances that should NOT be JSON serializable', () => {
      it('should return false for FormData', () => {
        const formData = new FormData();
        formData.append('key', 'value');
        expect(isJSONSerializable(formData)).toBe(false);
      });

      it('should return false for URLSearchParams', () => {
        const params = new URLSearchParams();
        params.append('key', 'value');
        expect(isJSONSerializable(params)).toBe(false);
      });

      it('should return false for Blob', () => {
        const blob = new Blob(['content'], { type: 'text/plain' });
        expect(isJSONSerializable(blob)).toBe(false);
      });

      it('should return false for File', () => {
        const file = new File(['content'], 'test.txt', {
          type: 'text/plain',
        });
        expect(isJSONSerializable(file)).toBe(false);
      });

      it('should return false for ArrayBuffer', () => {
        const buffer = new ArrayBuffer(8);
        expect(isJSONSerializable(buffer)).toBe(false);
      });

      it('should return false for TypedArrays', () => {
        expect(isJSONSerializable(new Uint8Array([1, 2, 3]))).toBe(false);
        expect(isJSONSerializable(new Int16Array([1, 2, 3]))).toBe(false);
        expect(isJSONSerializable(new Float32Array([1.5, 2.5]))).toBe(false);
        expect(isJSONSerializable(new Uint32Array([1, 2, 3]))).toBe(false);
      });

      it('should return false for ReadableStream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue('chunk');
            controller.close();
          },
        });
        expect(isJSONSerializable(stream)).toBe(false);
      });

      it('should return false for Request object', () => {
        const request = new Request('https://example.com');
        expect(isJSONSerializable(request)).toBe(false);
      });

      it('should return false for Response object', () => {
        const response = new Response('content');
        expect(isJSONSerializable(response)).toBe(false);
      });

      it('should return false for DataView', () => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        expect(isJSONSerializable(view)).toBe(false);
      });

      it('should return false for Error objects', () => {
        expect(isJSONSerializable(new Error('test'))).toBe(false);
        expect(isJSONSerializable(new TypeError('test'))).toBe(false);
        expect(isJSONSerializable(new RangeError('test'))).toBe(false);
      });

      it('should return false for RegExp', () => {
        expect(isJSONSerializable(/test/g)).toBe(false);
        expect(isJSONSerializable(new RegExp('test', 'i'))).toBe(false);
      });
    });

    it('should return false for undefined', () => {
      expect(isJSONSerializable(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isJSONSerializable(null)).toBe(false);
    });

    it('should return true for primitive types', () => {
      expect(isJSONSerializable('string')).toBe(true);
      expect(isJSONSerializable(123)).toBe(true);
      expect(isJSONSerializable(true)).toBe(true);
    });

    it('should return true for arrays', () => {
      expect(isJSONSerializable([1, 2, 3])).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isJSONSerializable(new Date())).toBe(false);
      expect(isJSONSerializable(new Map())).toBe(false);
      expect(isJSONSerializable(new Set())).toBe(false);
      expect(isJSONSerializable(new WeakMap())).toBe(false);
      expect(isJSONSerializable(new WeakSet())).toBe(false);
    });

    it('should return false for buffers', () => {
      const buffer = Buffer.from('test');
      expect(isJSONSerializable(buffer)).toBe(false);
    });

    it('should return true for plain objects', () => {
      expect(isJSONSerializable({})).toBe(true);
    });

    it('should return true for objects with toJSON method', () => {
      const obj = {
        toJSON() {
          return { key: 'value' };
        },
      };
      expect(isJSONSerializable(obj)).toBe(true);
    });

    it('should return false for functions', () => {
      const func = function () {};
      expect(isJSONSerializable(func)).toBe(false);
    });

    it('should return false for symbols', () => {
      const symbol = Symbol('test');
      expect(isJSONSerializable(symbol)).toBe(false);
    });

    it('should return false for Map', () => {
      const map = new Map();
      map.set('key', 'value');
      expect(isJSONSerializable(map)).toBe(false);
    });

    it('should return false for Set', () => {
      const set = new Set();
      set.add('value');
      expect(isJSONSerializable(set)).toBe(false);
    });

    it('should return false for Symbols', () => {
      const symbol = Symbol('description');
      expect(isJSONSerializable(symbol)).toBe(false);
    });

    it('should return false for class instances with methods', () => {
      class CustomClass {
        method() {}
      }
      const instance = new CustomClass();
      expect(isJSONSerializable(instance)).toBe(false);
    });
  });

  describe('replaceUrlPathParams()', () => {
    it('should replace a single placeholder with a value from urlPathParams', () => {
      const url = '/users/:userId';
      const params = { userId: 123 };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123');
    });

    it('should replace multiple placeholders with corresponding values from urlPathParams', () => {
      const url = '/users/:userId/posts/:postId';
      const params = { userId: 123, postId: 456 };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123/posts/456');
    });

    it('should leave placeholders unchanged if no corresponding value is provided in urlPathParams', () => {
      const url = '/users/:userId/posts/:postId';
      const params = { userName: 'john' };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/:userId/posts/:postId');
    });

    it('should handle placeholders with special characters', () => {
      const url = '/users/:userId/details/:detailId';
      const params = { userId: 123, detailId: 'abc' };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123/details/abc');
    });

    it('should handle empty urlPathParams object', () => {
      const url = '/users/:userId';
      const params = {};

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/:userId');
    });

    it('should replace placeholders even when URL contains query parameters', () => {
      const url = '/users/:userId?name=:name';
      const params = { userId: 123, name: 'john' };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123?name=john');
    });

    it('should handle URL with no placeholders', () => {
      const url = '/users/123';
      const params = { userId: 456 };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123');
    });

    it('should handle nested placeholders correctly', () => {
      const url = '/users/:userId/posts/:postId/details/:detailId';
      const params = { userId: 123, postId: 456, detailId: 'abc' };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/users/123/posts/456/details/abc');
    });

    it('should replace conflicting placeholders with corresponding values', () => {
      const url = '/items/:itemId/details/:itemId';
      const params = { itemId: 'value1' };

      const result = replaceUrlPathParams(url, params);

      expect(result).toBe('/items/value1/details/value1');
    });
  });

  describe('appendQueryParams()', () => {
    it('should append single query parameter to URL without existing query string', () => {
      const url = 'https://api.example.com/resource';
      const params = { foo: 'bar' };
      const result = appendQueryParams(url, params);
      expect(result).toBe('https://api.example.com/resource?foo=bar');
    });

    it('should append multiple query parameters to URL without existing query string', () => {
      const url = 'https://api.example.com/resource';
      const params = { foo: 'bar', baz: 'qux' };
      const result = appendQueryParams(url, params);
      expect(result).toBe('https://api.example.com/resource?foo=bar&baz=qux');
    });

    it('should append array query parameters correctly', () => {
      const url = 'https://api.example.com/resource';
      const params = { foo: [1, 2], bar: 'baz' };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?foo[]=1&foo[]=2&bar=baz',
      );
    });

    it('should append parameters to URL with existing query string', () => {
      const url = 'https://api.example.com/resource?existing=param';
      const params = { foo: 'bar' };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?existing=param&foo=bar',
      );
    });

    it('should handle special characters in query parameters', () => {
      const url = 'https://api.example.com/resource';
      const params = { 'special key': 'special value' };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?special%20key=special%20value',
      );
    });

    it('should return the original URL if no params are provided', () => {
      const url = 'https://api.example.com/resource';
      const params = {};
      const result = appendQueryParams(url, params);
      expect(result).toBe('https://api.example.com/resource');
    });

    it('should handle appending array parameters to URL with existing query string', () => {
      const url = 'https://api.example.com/resource?existing=param';
      const params = { foo: [1, 2], bar: 'baz' };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?existing=param&foo[]=1&foo[]=2&bar=baz',
      );
    });

    it('should encode special characters in query parameters', () => {
      const url = 'https://api.example.com/resource';
      const params = { 'special key!@#': 'special value$%^' };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?special%20key!%40%23=special%20value%24%25%5E',
      );
    });

    it('should handle numeric keys correctly', () => {
      const url = 'https://api.example.com/resource';
      const params = { 123: 'numeric' };
      const result = appendQueryParams(url, params);
      expect(result).toBe('https://api.example.com/resource?123=numeric');
    });

    it('should handle URL with no query parameters and special characters in values', () => {
      const url = 'https://api.example.com/resource';
      const params = {
        'special value': 'value with special characters !@#$%^&*()',
      };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?special%20value=value%20with%20special%20characters%20!%40%23%24%25%5E%26*()',
      );
    });

    it('should handle parameters with different types of values', () => {
      const url = 'https://api.example.com/resource';
      const params = {
        string: 'string',
        number: 123,
        boolean: true,
        array: [1, 2],
      };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?string=string&number=123&boolean=true&array[]=1&array[]=2',
      );
    });

    it('should handle params as an instance of URLSearchParams', () => {
      const url = 'https://api.example.com/resource';
      const params = new URLSearchParams();
      params.append('foo', 'bar');
      params.append('baz', 'qux');
      const result = appendQueryParams(url, params);
      expect(result).toBe('https://api.example.com/resource?foo=bar&baz=qux');
    });

    it('should handle params as an instance of URLSearchParams for url with existing query params', () => {
      const url = 'https://api.example.com/resource?biz=due';
      const params = new URLSearchParams();
      params.append('foo', 'bar');
      params.append('baz', 'qux');
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?biz=due&foo=bar&baz=qux',
      );
    });

    it('should not append question mark when params are empty and instance of URLSearchParams is parsed', () => {
      const url = 'https://api.example.com/resource';
      const params = new URLSearchParams();
      const result = appendQueryParams(url, params);
      expect(result).toBe(url);
    });

    it('should handle complex nested parameters', () => {
      const url = 'https://api.example.com/resource';
      const params = { nested: { foo: 'bar', baz: [1, 2] } };
      const result = appendQueryParams(url, params);
      expect(result).toBe(
        'https://api.example.com/resource?nested%5Bfoo%5D=bar&nested%5Bbaz%5D[]=1&nested%5Bbaz%5D[]=2',
      );
    });

    it('should handle array of objects with params', () => {
      const url = 'https://api.example.com/resource';
      const params = [
        { name: 'username', value: 'john_doe' },
        { name: 'password', value: 'secure123' },
      ];
      const result = appendQueryParams(url, params);

      expect(result).toBe(
        'https://api.example.com/resource?username=john_doe&password=secure123',
      );
    });

    it('should return the same url if empty array is propagated', () => {
      const url = 'https://api.example.com/resource';
      const params: [] = [];
      const result = appendQueryParams(url, params);

      expect(result).toBe(url);
    });

    it('should return the same url if null is propagated', () => {
      const url = 'https://api.example.com/resource';
      const params = null;
      const result = appendQueryParams(url, params);

      expect(result).toBe(url);
    });
  });

  describe('isAbsoluteUrl()', () => {
    it('should return true for absolute URLs', () => {
      const schemes = ['http', 'https', 'ftp', 'file', 'mailto'];
      for (const scheme of schemes) {
        expect(isAbsoluteUrl(`${scheme}://foo`)).toBe(true);
      }
    });

    it('should return false for malformed URLs', () => {
      expect(isAbsoluteUrl('http//foo')).toBe(false);
      expect(isAbsoluteUrl('://foo')).toBe(false);
      expect(isAbsoluteUrl('')).toBe(false);
    });

    it('should return false for relative URLs', () => {
      expect(isAbsoluteUrl('/path/to/resource')).toBe(false);
    });
  });

  describe('delayInvocation()', () => {
    // Set up fake timers before all tests
    beforeAll(() => {
      jest.useFakeTimers();
    });

    // Clean up fake timers after all tests
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should resolve after the specified delay', async () => {
      const delay = 100; // 100 milliseconds

      // Call the function but don't wait yet
      const promise = delayInvocation(delay);

      // Fast-forward time by 100 milliseconds
      jest.advanceTimersByTime(delay);

      // Await the promise and check the result
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should resolve with true', async () => {
      const promise = delayInvocation(100);

      // Fast-forward time by 100 milliseconds
      jest.advanceTimersByTime(100);

      // Await the promise and check the result
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should resolve immediately for zero delay', async () => {
      const promise = delayInvocation(0);

      // Fast-forward time by 0 milliseconds (immediate resolve)
      jest.advanceTimersByTime(0);

      // Await the promise and check the result
      const result = await promise;
      expect(result).toBe(true);
    });
  });

  describe('processHeaders()', () => {
    it('should return an empty object if headers are null or undefined', () => {
      const result = processHeaders(null);
      expect(result).toEqual({});

      const resultUndefined = processHeaders(undefined);
      expect(resultUndefined).toEqual({});
    });

    it('should convert Headers object to a plain object', () => {
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('Authorization', 'Bearer token');

      const result = processHeaders(headers);

      expect(result).toEqual({
        'content-type': 'application/json',
        authorization: 'Bearer token',
      });
    });

    it('should handle plain object headers', () => {
      const result = processHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });

      expect(result).toEqual({
        'content-type': 'application/json',
        authorization: 'Bearer token',
      });
    });

    it('should handle an empty Headers object', () => {
      const headers = new Headers(); // Empty Headers
      const result = processHeaders(headers);

      expect(result).toEqual({});
    });
  });
});
