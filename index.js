'use config';

const naturalSort = require('natural-sort')();
const diff = require('diff');

// Removes trailing space, comments, carriage returns, and blank lines
// Junk that won't help us in the diff
function cleanScript(value) {
  return value
    // Remove carriage returns, comments, trailing whitespace
    .replace(/\r|\s*!.*$|[ \t]+$/gm, '')

    // Remove blank lines
    .replace(/\n{2,}/g, '\n')

    // Remove first blank lines
    .replace(/^\n+/, '');
}

// Converts a clean config (see cleanScript) into a structure based on indentation
function structure(value) {
  const stack = [{ children: [] }];
  let currentLevel = stack[0], lastLine = null;

  for(let rawLine of value.split(/\n/g)) {
    const indent = rawLine.search(/[^ ]/);

    if(indent === -1)
      continue;

    const line = { value: rawLine.substr(indent), children: undefined };

    if(indent > stack.length - 1) {
      if(indent !== stack.length)
        throw new Error('Malformed input');

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
      value: obj.value,
      children: obj.children && obj.children.map(c => markRecursive(c, true)),
      added: true,
    };
  }
  else {
    return {
      value: obj.value,
      children: obj.children && obj.children.map(c => markRecursive(c, false)),
      removed: true,
    };
  }
}

function compareLines(a, b) {
  return naturalSort(a.key || a.value, b.key || b.value);
}

function cleanDiffObj(obj) {
  // Remove the useless "count" property from JsDiff's output
  delete obj.count;
  return obj;
}

// Performs a difference on the output of two structured texts (return value of structure)
function diffStructured(inputA, inputB) {
  // Pick from each cart in sort order
  const a = inputA.sort(compareLines);
  const b = inputB.sort(compareLines);
  const result = [];

  let indexA = 0, indexB = 0;

  while((indexA < a.length) && (indexB < b.length)) {
    const comp = compareLines(a[indexA], b[indexB]);

    if(comp === 0) {
      // It's the same section/line; but if the values are different, perform a diff
      const value = (a[indexA].value === b[indexB].value) ? a[indexA].value : diff.diffWords(a[indexA].value, b[indexB].value).map(cleanDiffObj);

      // Recurse
      result.push({
        value: value,
        children: (a[indexA].children || b[indexB].children) && diffStructured(a[indexA].children || [], b[indexB].children || [])
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

module.exports.cleanScript = cleanScript;
module.exports.structure = structure;
module.exports.diffStructured = diffStructured;
