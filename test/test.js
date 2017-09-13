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
        ] },
      ] },
      { value: [
        { value: 'ip domain name ' },
        { value: 'fluggo', removed: true },
        { value: 'tango', added: true },
        { value: '.com' },
      ] },
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
});
