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
