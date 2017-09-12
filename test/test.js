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
      { text: 'interface Embedded-Service-Engine0/0',
        children: [
          { text: 'no ip address' },
          { text: 'shutdown' },
        ] },
      { text: 'interface GigabitEthernet0/0',
        children: [
          { text: 'description Floor 3 switch' },
          { text: 'no ip address' },
          { text: 'duplex auto' },
          { text: 'speed auto' },
        ] },
      { text: 'no ip bootp server' },
      { text: 'no ip domain lookup' },
      { text: 'archive',
        children: [
          { text: 'log config',
            children: [
              { text: 'logging enable' },
              { text: 'logging size 200' },
            ] },
          { text: 'write-memory' },
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
      { text: 'interface Embedded-Service-Engine0/0', children: [
        { text: 'no ip address', children: [
          { text: 'shutdown' },
        ] },
      ] },
      { text: 'no ip bootp server' },
    ]);
  });
});


describe('diffStructured', function() {
  const cleanScript = require('../index.js').cleanScript;
  const structure = require('../index.js').structure;
  const diffStructured = require('../index.js').diffStructured;

  it('Produces a basic diff', function() {
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
      { text: 'archive',
        children: [
          { text: 'log config',
            children: [
              { text: 'logging enable' },
              { text: 'logging size 200' },
              { text: 'record rc', removed: true },
            ] },
          { text: 'write-memory' },
        ] },
      { text: 'interface Embedded-Service-Engine0/0',
        children: [
          { text: 'ip address 10.11.0.165 255.255.255.255', added: true },
          { text: 'no ip address', removed: true },
          { text: 'shutdown' },
        ] },
      { text: 'interface GigabitEthernet0/0', removed: true,
        children: [
          { text: 'description Floor 3 switch', removed: true },
          { text: 'no ip address', removed: true },
          { text: 'duplex auto', removed: true },
          { text: 'speed auto', removed: true },
        ] },
      { text: 'interface GigabitEthernet0/1', added: true,
        children: [
          { text: 'description Floor 3 switch', added: true },
          { text: 'no ip address', added: true },
          { text: 'duplex auto', added: true },
          { text: 'speed auto', added: true },
        ] },
      { text: 'ip domain name fluggo.com', added: true },
      { text: 'no ip bootp server' },
      { text: 'no ip domain lookup' },
    ]);
  });
});
