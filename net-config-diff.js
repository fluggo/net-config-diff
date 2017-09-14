#!/usr/bin/env node
'use config';

const program = require('commander');
const package = require('./package.json');
const fs = require('fs');
const diff = require('./index.js');
const cisco = require('./cisco.js');
const colors = require('colors');

let oldfile, newfile;

program
  .version(package.version)
  .arguments('<oldfile> <newfile>')
  .action((oldfilearg, newfilearg) => {
    oldfile = oldfilearg;
    newfile = newfilearg;
  })
  .parse(process.argv);

const oldfileText = fs.readFileSync(oldfile, {encoding: 'utf8'}),
  newfileText = fs.readFileSync(newfile, {encoding: 'utf8'});

console.log(oldfileText.length, newfileText.length);

const oldStructured = diff.structure(cisco.linesplit(diff.cleanScript(oldfileText)));
const newStructured = diff.structure(cisco.linesplit(diff.cleanScript(newfileText)));

cisco.mark(oldStructured);
cisco.mark(newStructured);

const result = diff.diffStructured(oldStructured, newStructured);

//console.log(JSON.stringify(result, null, 2));
outputDiff(result, 0);

function outputDiff(diff, indent) {
  const indentStr = ' '.repeat(indent);

  for(let line of diff) {
    if(Array.isArray(line.value)) {
      // Word-by-word diff
      console.log('!' + indentStr + line.value.map(t => t.added ? t.value.green : (t.removed ? t.value.red.strikethrough : t.value)).join(''));
    }
    else {
      // Line-by-line diff
      console.log((line.added ? '+' : (line.removed ? '-' : ' ')) + indentStr + (line.added ? line.value.green : (line.removed ? line.value.red : line.value)));
    }

    if(line.children)
      outputDiff(line.children, indent + 1);
  }
}
