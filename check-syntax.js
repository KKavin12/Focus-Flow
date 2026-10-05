const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.error('ERROR: No <script type="text/babel"> block found');
  process.exit(1);
}

const code = scriptMatch[1];
console.log('Script block extracted successfully! Length:', code.length);

// Check matching braces, brackets, parentheses
const stack = [];
const pairs = { '(': ')', '{': '}', '[': ']' };
const lines = code.split('\n');

let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  if (ch === '{') openBraces++;
  else if (ch === '}') openBraces--;
  else if (ch === '(') openParens++;
  else if (ch === ')') openParens--;
  else if (ch === '[') openBrackets++;
  else if (ch === ']') openBrackets--;
}

console.log('Balance check:', { openBraces, openParens, openBrackets });

if (openBraces === 0 && openParens === 0 && openBrackets === 0) {
  console.log('SUCCESS: All brackets, braces, and parentheses are balanced perfectly!');
} else {
  console.error('WARNING: Balance mismatch detected!');
  process.exit(1);
}
