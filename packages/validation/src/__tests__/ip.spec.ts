import { describe, it } from '@jest/globals';
import { invalid, valid } from './helpers';

describe('isIp', () => {
  describe('valid IPv4', () => {
    it('standard IP', () => valid('192.168.1.1', 'isIp'));
    it('loopback', () => valid('127.0.0.1', 'isIp'));
    it('broadcast', () => valid('255.255.255.255', 'isIp'));
    it('zeros', () => valid('0.0.0.0', 'isIp'));
  });

  describe('valid IPv6', () => {
    it('full IPv6', () => valid('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 'isIp'));
    it('compressed IPv6', () => valid('::1', 'isIp'));
    it('partially compressed', () => valid('2001:db8::1', 'isIp'));
  });

  describe('invalid', () => {
    it('partial IPv4', () => invalid('192.168.1', 'isIp'));
    it('out of range octet', () => invalid('256.0.0.1', 'isIp'));
    it('999.999.999.999', () => invalid('999.999.999.999', 'isIp'));
    it('plain text', () => invalid('not-an-ip', 'isIp'));
    it('empty string', () => invalid('', 'isIp'));
    it('hostname', () => invalid('localhost', 'isIp'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(192168, 'isIp'));
    it('null', () => invalid(null, 'isIp'));
    it('object', () => invalid({}, 'isIp'));
    it('array', () => invalid(['192.168.1.1'], 'isIp'));
    it('boolean', () => invalid(true, 'isIp'));
  });
});

describe('isIpv4', () => {
  describe('valid', () => {
    it('standard IP', () => valid('192.168.1.1', 'isIpv4'));
    it('loopback', () => valid('127.0.0.1', 'isIpv4'));
    it('zeros', () => valid('0.0.0.0', 'isIpv4'));
  });

  describe('invalid', () => {
    it('IPv6 address', () => invalid('::1', 'isIpv4'));
    it('IPv6 full', () => invalid('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 'isIpv4'));
    it('out of range octet 256', () => invalid('256.0.0.1', 'isIpv4'));
    it('partial address', () => invalid('192.168.1', 'isIpv4'));
    it('empty string', () => invalid('', 'isIpv4'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(192168, 'isIpv4'));
    it('null', () => invalid(null, 'isIpv4'));
    it('object', () => invalid({}, 'isIpv4'));
    it('boolean', () => invalid(false, 'isIpv4'));
  });
});

describe('isIpv6', () => {
  describe('valid', () => {
    it('full IPv6', () => valid('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 'isIpv6'));
    it('compressed loopback', () => valid('::1', 'isIpv6'));
    it('partially compressed', () => valid('2001:db8::1', 'isIpv6'));
  });

  describe('invalid', () => {
    it('IPv4 address', () => invalid('192.168.1.1', 'isIpv6'));
    it('invalid hex groups', () => invalid('gggg::1', 'isIpv6'));
    it('too many groups', () => invalid('1:2:3:4:5:6:7:8:9', 'isIpv6'));
    it('empty string', () => invalid('', 'isIpv6'));
    it('plain text', () => invalid('not-ip', 'isIpv6'));
  });

  describe('wrong value types', () => {
    it('number', () => invalid(1, 'isIpv6'));
    it('null', () => invalid(null, 'isIpv6'));
    it('object', () => invalid({}, 'isIpv6'));
    it('boolean', () => invalid(true, 'isIpv6'));
  });
});
