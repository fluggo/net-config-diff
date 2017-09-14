'use strict';

const expect = require('chai').expect;

describe('linesplit', function() {
  const cleanScript = require('../index.js').cleanScript;
  const linesplit = require('../cisco.js').linesplit;
  const structure = require('../index.js').structure;

  it('handles banner motd and banner exec command', function() {
    const TEXT = `
banner motd \x03
**********************
* This is the banner *
**********************
\x03
!
banner exec \x03
This beep boop squandilipocious
\x03
!
snmp-server community hahaha
`;

    expect(linesplit(cleanScript(TEXT))).to.deep.equal([
      'banner motd \x03\n**********************\n* This is the banner *\n**********************\n\x03',
      'banner exec \x03\nThis beep boop squandilipocious\n\x03',
      'snmp-server community hahaha',
    ]);
  });

  it('handles certificate command', function() {
    const TEXT = `
crypto pki certificate chain
 certificate self-signed 01
  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF
  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF
    exit
!
snmp-server community hahaha
`;

    expect(linesplit(cleanScript(TEXT))).to.deep.equal([
      'crypto pki certificate chain',
      ' certificate self-signed 01\n  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF\n  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF\n    exit',
      'snmp-server community hahaha',
    ]);

    expect(JSON.parse(JSON.stringify(structure(linesplit(cleanScript(TEXT)))))).to.deep.equal([
      { value: 'crypto pki certificate chain', children: [
        { value: 'certificate self-signed 01\n  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF\n  DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF DEADBEEF\n    exit' }
      ] },
      { value: 'snmp-server community hahaha' },
    ]);
  });
});

