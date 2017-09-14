'use config';

function linesplit(text) {
  const result = [];

  const BANNER_MOTD_REGEXP = /^banner motd (.)/gmy;
  const BANNER_EXEC_REGEXP = /^banner exec (.)/gmy;
  const CERTIFICATE_REGEXP = /^ certificate /gmy;

  let lastIndex = 0;
  let lineNumber = 0;

  while(lastIndex < text.length) {
    BANNER_MOTD_REGEXP.lastIndex = lastIndex;
    BANNER_EXEC_REGEXP.lastIndex = lastIndex;
    CERTIFICATE_REGEXP.lastIndex = lastIndex;

    const bannerMotdMatch = BANNER_MOTD_REGEXP.exec(text);
    const bannerExecMatch = BANNER_EXEC_REGEXP.exec(text);
    const certficateMatch = CERTIFICATE_REGEXP.exec(text);

    if(bannerMotdMatch) {
      const delim = bannerMotdMatch[1];

      // Find the delimiter that marks the end of the command
      const endIndex = text.indexOf(delim, bannerMotdMatch.index + bannerMotdMatch[0].length);

      if(endIndex === -1)
        throw new Error(`Could not find the end of the banner motd command on line ${lineNumber}.`);

      // Find the newline that truly ends the command
      const newLineIndex = text.indexOf('\n', endIndex);

      const commandText = text.substring(bannerMotdMatch.index, Math.max(endIndex + delim.length, newLineIndex));
      result.push(commandText);

      lineNumber += (commandText.match(/\n/g) || []).length + 1;
      lastIndex = Math.max(endIndex + delim.length, newLineIndex + 1);
    }
    else if(bannerExecMatch) {
      const delim = bannerExecMatch[1];

      // Find the delimiter that marks the end of the command
      const endIndex = text.indexOf(delim, bannerExecMatch.index + bannerExecMatch[0].length);

      if(endIndex === -1)
        throw new Error(`Could not find the end of the banner exec command on line ${lineNumber}.`);

      // Find the newline that truly ends the command
      const newLineIndex = text.indexOf('\n', endIndex);

      const commandText = text.substring(bannerExecMatch.index, Math.max(endIndex + delim.length, newLineIndex));
      result.push(commandText);

      lineNumber += (commandText.match(/\n/g) || []).length + 1;
      lastIndex = Math.max(endIndex + delim.length, newLineIndex + 1);
    }
    else if(certficateMatch) {
      const delim = ' quit';

      // Find the delimiter that marks the end of the command
      const endIndex = text.indexOf(delim, certficateMatch.index + certficateMatch[0].length);

      if(endIndex === -1)
        throw new Error(`Could not find the end of the certificate command on line ${lineNumber}.`);

      // Find the newline that truly ends the command
      const newLineIndex = text.indexOf('\n', endIndex);

      const commandText = text.substring(certficateMatch.index, Math.max(endIndex + delim.length, newLineIndex));
      result.push(commandText);

      lineNumber += (commandText.match(/\n/g) || []).length + 1;
      lastIndex = Math.max(endIndex + delim.length, newLineIndex + 1);
    }
    else {
      let newLineIndex = text.indexOf('\n', lastIndex);

      if(newLineIndex === -1)
        newLineIndex = text.length;

      const commandText = text.substring(lastIndex, newLineIndex);
      result.push(commandText);

      lineNumber++;
      lastIndex = newLineIndex + 1;
    }
  }

  return result;
}

function markVlanLine(line) {
  if(line.value.startsWith('name ')) {
    console.error('in name');
    line.key = 'name ';
  }
}

function markInterfaceLine(line) {
  if(line.value.startsWith('description ')) {
    line.key = 'description ';
  }
  else if(line.value.startsWith('ip address ')) {
    line.key = 'ip address ';
  }
}

function mark(structuredText) {
  // Top-level marking of statements
  for(let line of structuredText) {
    if(line.value.startsWith('vlan ')) {
      line.children.forEach(markVlanLine);
    }
    else if(line.value.startsWith('interface ')) {
      line.children.forEach(markInterfaceLine);
    }
  }
}

module.exports.linesplit = linesplit;
module.exports.mark = mark;
