'use config';

const naturalSort = require('natural-sort')();

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

function markRecursive(obj, added) {
  if(added) {
    return {
      text: obj.text,
      children: obj.children && obj.children.map(c => markRecursive(c, true)),
      added: true,
    };
  }
  else {
    return {
      text: obj.text,
      children: obj.children && obj.children.map(c => markRecursive(c, false)),
      removed: true,
    };
  }
}

function sortedDiff(inputA, inputB) {
  // Pick from each cart in sort order
  const a = inputA.sort((a, b) => naturalSort(a.text, b.text));
  const b = inputB.sort((a, b) => naturalSort(a.text, b.text));
  const result = [];

  let indexA = 0, indexB = 0;

  while((indexA < a.length) && (indexB < b.length)) {
    const comp = naturalSort(a[indexA].text, b[indexB].text);

    if(comp === 0) {
      // It's the same section, recurse
      result.push({
        text: a[indexA].text,
        children: a[indexA].children && diffStructured(a[indexA].children, b[indexB].children)
      });

      indexA++;
      indexB++;
    }
    else if(comp < 0) {
      result.push(markRecursive(a[indexA], false));
      indexA++;
    }
    else {
      result.push(markRecursive(b[indexB], true));
      indexB++;
    }
  }

  // Push remaining items
  result.push(...a.slice(indexA).map(a => markRecursive(a, false)), ...b.slice(indexB).map(b => markRecursive(b, true)));

  return result;
}

// Performs a difference on the output of two structured texts (return value of structure)
function diffStructured(a, b) {
  return [].concat(
    // Produce sorted diff of sections
    sortedDiff(a.filter(line => line.children), b.filter(line => line.children)),

    // Produce sorted diff of loose lines
    sortedDiff(a.filter(line => !line.children), b.filter(line => !line.children))
  );
}

module.exports.cleanScript = cleanScript;
module.exports.structure = structure;
module.exports.diffStructured = diffStructured;
