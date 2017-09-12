'use config';

// Removes trailing space, comments, carriage returns, and blank lines
// Junk that won't help us in the diff
function cleanScript(text) {
  return text
    // Remove carriage returns, comments, trailing whitespace
    .replace(/\r|\s*!.*$|[ \t]+$/gm, '')

    // Remove blank lines
    .replace(/\n{2,}/g, '\n')

    // Remove first blank lines
    .replace(/^\n+/, '');
}

// Converts a clean config (see cleanScript) into a structure based on indentation
// This does expect a well-behaved text, non-well-behaved will crash it
function structure(text) {
  const stack = [{ children: [] }];
  let currentLevel = stack[0], lastLine = null;

  for(let rawLine of text.split(/\n/g)) {
    const indent = rawLine.search(/[^ ]/);

    if(indent === -1)
      continue;

    const line = { text: rawLine.substr(indent), children: undefined };

    while(indent > stack.length - 1) {
      // Last line was a header, move it up
      stack.push(currentLevel);
      currentLevel = lastLine;
      currentLevel.children = [];
    }

    while(indent < stack.length - 1) {
      // Coming out
      currentLevel = stack.pop();
    }

    currentLevel.children.push(line);
    lastLine = line;
  }

  return stack[0].children;
}

module.exports.cleanScript = cleanScript;
module.exports.structure = structure;
