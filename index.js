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

module.exports.cleanScript = cleanScript;
