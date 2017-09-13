'use strict';

const expect = require('chai').expect;

describe('cleanScript', function() {
  const cleanScript = require('../index.js').cleanScript;

  it('removes common obstructions from a script', function() {
    const TEXT = '\n! This is a test script\ninterface Tunnel201 ! this is a comment\n ip address 10.11.1.1 255.255.255.255\r\n!\r\n!\nhostname fluggo.com\n';

    expect(cleanScript(TEXT)).to.equal(
      'interface Tunnel201\n ip address 10.11.1.1 255.255.255.255\nhostname fluggo.com\n'
    );
  });
});

describe('structure', function() {
  const cleanScript = require('../index.js').cleanScript;
  const structure = require('../index.js').structure;

  it('structures a script', function() {
    const TEXT = `interface Embedded-Service-Engine0/0
 no ip address
 shutdown
!
interface GigabitEthernet0/0
 description Floor 3 switch
 no ip address
 duplex auto
 speed auto
!
no ip bootp server
no ip domain lookup
!
archive
 log config
  logging enable
  logging size 200
 write-memory
`;

    const RESULT_TEMP = structure(cleanScript(TEXT));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'interface Embedded-Service-Engine0/0',
        children: [
          { value: 'no ip address' },
          { value: 'shutdown' },
        ] },
      { value: 'interface GigabitEthernet0/0',
        children: [
          { value: 'description Floor 3 switch' },
          { value: 'no ip address' },
          { value: 'duplex auto' },
          { value: 'speed auto' },
        ] },
      { value: 'no ip bootp server' },
      { value: 'no ip domain lookup' },
      { value: 'archive',
        children: [
          { value: 'log config',
            children: [
              { value: 'logging enable' },
              { value: 'logging size 200' },
            ] },
          { value: 'write-memory' },
        ] },
    ]);
  });

  it('handles a cliff (multi-indent drop)', function() {
    const TEXT = `interface Embedded-Service-Engine0/0
 no ip address
  shutdown
no ip bootp server
`;

    const RESULT_TEMP = structure(cleanScript(TEXT));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'interface Embedded-Service-Engine0/0', children: [
        { value: 'no ip address', children: [
          { value: 'shutdown' },
        ] },
      ] },
      { value: 'no ip bootp server' },
    ]);
  });

  it('handles malformed input', function() {
    expect(() => structure('  interface blah\nnerp')).to.throw("Malformed input");
    expect(() => structure('interface blah\n  nerp')).to.throw("Malformed input");
  });
});


describe('diffStructured', function() {
  const cleanScript = require('../index.js').cleanScript;
  const structure = require('../index.js').structure;
  const diffStructured = require('../index.js').diffStructured;

  it('produces a basic diff', function() {
    const TEXT_A = `interface Embedded-Service-Engine0/0
 no ip address
 shutdown
!
interface GigabitEthernet0/0
 description Floor 3 switch
 no ip address
 duplex auto
 speed auto
!
no ip bootp server
no ip domain lookup
!
archive
 log config
  record rc
  logging enable
  logging size 200
 write-memory
`;

    const TEXT_B = `interface Embedded-Service-Engine0/0
 ip address 10.11.0.165 255.255.255.255
 shutdown
!
interface GigabitEthernet0/1
 description Floor 3 switch
 no ip address
 duplex auto
 speed auto
!
no ip bootp server
no ip domain lookup
ip domain name fluggo.com
!
archive
 log config
  logging enable
  logging size 200
 write-memory
`;

    const RESULT_TEMP = diffStructured(structure(cleanScript(TEXT_A)), structure(cleanScript(TEXT_B)));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'archive',
        children: [
          { value: 'log config',
            children: [
              { value: 'logging enable' },
              { value: 'logging size 200' },
              { value: 'record rc', removed: true },
            ] },
          { value: 'write-memory' },
        ] },
      { value: 'interface Embedded-Service-Engine0/0',
        children: [
          { value: 'ip address 10.11.0.165 255.255.255.255', added: true },
          { value: 'no ip address', removed: true },
          { value: 'shutdown' },
        ] },
      { value: 'interface GigabitEthernet0/0', removed: true,
        children: [
          { value: 'description Floor 3 switch', removed: true },
          { value: 'no ip address', removed: true },
          { value: 'duplex auto', removed: true },
          { value: 'speed auto', removed: true },
        ] },
      { value: 'interface GigabitEthernet0/1', added: true,
        children: [
          { value: 'description Floor 3 switch', added: true },
          { value: 'no ip address', added: true },
          { value: 'duplex auto', added: true },
          { value: 'speed auto', added: true },
        ] },
      { value: 'ip domain name fluggo.com', added: true },
      { value: 'no ip bootp server' },
      { value: 'no ip domain lookup' },
    ]);
  });

  it('recognizes and matches single-keyed lines and sections', function() {
    const LINES_A = [
      { value: 'ip domain name fluggo.com', key: 'ip domain name ' },
      { value: 'interface GigabitEthernet0', children: [
        { value: 'description Floor 3 switch', key: 'description ' },
      ] },
    ];

    const LINES_B = [
      { value: 'ip domain name tango.com', key: 'ip domain name ' },
      { value: 'interface GigabitEthernet0', children: [
        { value: 'description Floor 4 switch', key: 'description ' },
      ] },
    ];

    const RESULT_TEMP = diffStructured(LINES_A, LINES_B);

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'interface GigabitEthernet0', children: [
        { value: [
          { value: 'description Floor ' },
          { value: '3', removed: true },
          { value: '4', added: true },
          { value: ' switch' },
        ], key: 'description ' },
      ] },
      { value: [
        { value: 'ip domain name ' },
        { value: 'fluggo', removed: true },
        { value: 'tango', added: true },
        { value: '.com' },
      ], key: 'ip domain name ' },
    ]);
  });

  it('handles mismatched sections/lines', function() {
    const TEXT_A = `
!
interface GigabitEthernet0/0
 description Floor 3 switch
 no ip address
 duplex auto
 speed auto
`;

    const TEXT_B = `
!
interface GigabitEthernet0/0
!
`;

    const RESULT_TEMP = diffStructured(structure(cleanScript(TEXT_A)), structure(cleanScript(TEXT_B)));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'interface GigabitEthernet0/0',
        children: [
          { value: 'description Floor 3 switch', removed: true },
          { value: 'duplex auto', removed: true },
          { value: 'no ip address', removed: true },
          { value: 'speed auto', removed: true },
        ] },
    ]);
  });

  it('preserves "extra" property in single-keyed lines and sections', function() {
    const LINES_A = [
      { value: 'ip domain name fluggo.com', key: 'ip domain name ', extra: 'extra1' },
      { value: 'interface GigabitEthernet0', extra: 'extra2', children: [
        { value: 'description Floor 3 switch', key: 'description ', extra: 'extra3' },
      ] },
    ];

    const LINES_B = [
      { value: 'ip domain name tango.com', key: 'ip domain name ', extra: 'extra1' },
      { value: 'interface GigabitEthernet0', extra: 'extra2', children: [
        { value: 'description Floor 4 switch', key: 'description ', extra: 'extra3' },
      ] },
    ];

    const RESULT_TEMP = diffStructured(LINES_A, LINES_B);

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
      { value: 'interface GigabitEthernet0', extra: 'extra2', children: [
        { value: [
          { value: 'description Floor ' },
          { value: '3', removed: true },
          { value: '4', added: true },
          { value: ' switch' },
        ], key: 'description ', extra: 'extra3' },
      ] },
      { value: [
        { value: 'ip domain name ' },
        { value: 'fluggo', removed: true },
        { value: 'tango', added: true },
        { value: '.com' },
      ], key: 'ip domain name ', extra: 'extra1' },
    ]);
  });

  it('handles multi-statement sections', function() {
    function prepareLine(line) {
      return {
        value: line,
        key: line.match(/^access-list \d+ /)[0],
        ordered: true,
      };
    }

    function prepare(text) {
      return cleanScript(text).split(/\n/g).map(prepareLine);
    }

    const TEXT_A = `access-list 12 remark SSH
access-list 12 permit 10.12.66.132
access-list 12 permit 10.12.66.119
access-list 12 permit 10.12.67.215
access-list 13 permit 12.15.9.45
access-list 13 remark Bork
access-list 13 permit 10.1.1.15
access-list 13 deny 2.9.6.3
access-list 13 permit 45.45.45.45
access-list 13 permit 1.1.1.1
access-list 13 deny any log`;

    const TEXT_B = `access-list 12 remark SSH
access-list 12 permit 10.12.66.132
access-list 13 remark Bork
access-list 13 permit 12.15.9.45
access-list 13 permit 10.1.1.15
access-list 12 permit 10.12.67.215
access-list 13 permit 45.45.45.45
access-list 13 permit 1.1.1.1
access-list 13 deny any log`;

    const RESULT_TEMP = diffStructured(prepare(TEXT_A), prepare(TEXT_B));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 remark SSH', },
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 permit 10.12.66.132', },
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 permit 10.12.66.119', removed: true, },
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 permit 10.12.67.215', },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 remark Bork', added: true, },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 permit 12.15.9.45', },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 remark Bork', removed: true, },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 permit 10.1.1.15', },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 deny 2.9.6.3', removed: true, },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 permit 45.45.45.45', },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 permit 1.1.1.1', },
{ key: 'access-list 13 ', ordered: true, value: 'access-list 13 deny any log', },
    ]);
  });

  it('preserves "extra" property in multi-statement sections', function() {
    function prepareLine(line) {
      return {
        value: line,
        key: line.match(/^access-list \d+ /)[0],
        ordered: true,
        extra: 'extraprop',
      };
    }

    function prepare(text) {
      return cleanScript(text).split(/\n/g).map(prepareLine);
    }

    const TEXT_A = `access-list 12 remark SSH
access-list 12 permit 10.12.66.132`;

    const TEXT_B = `access-list 12 remark SSH
access-list 12 permit 10.12.66.133`;

    const RESULT_TEMP = diffStructured(prepare(TEXT_A), prepare(TEXT_B));

    // Run the result through JSON to eliminate the undefined properties, which are there for perfomance reasons
    const RESULT = JSON.parse(JSON.stringify(RESULT_TEMP));

    expect(RESULT).to.deep.equal([
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 remark SSH', extra: 'extraprop' },
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 permit 10.12.66.132', removed: true, extra: 'extraprop' },
{ key: 'access-list 12 ', ordered: true, value: 'access-list 12 permit 10.12.66.133', added: true, extra: 'extraprop' },
    ]);
  });
});
