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
