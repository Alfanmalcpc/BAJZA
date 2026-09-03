const fs = require('fs');
const content = fs.readFileSync('trash-register.html', 'utf8');
let lines = content.split('\n');

let open = 0;
let inTemplate = false;

let scriptStart = lines.findIndex(l => l.includes('<script>'));
for(let i=scriptStart; i<lines.length; i++) {
  let line = lines[i];
  if(line.includes('</script>')) {
      console.log('End of script at line', i+1, 'Open brackets:', open);
      break;
  }
  
  for(let j=0; j<line.length; j++) {
    let char = line[j];
    let prev = j > 0 ? line[j-1] : '';
    
    if (char === '\`' && prev !== '\\') inTemplate = !inTemplate;
    if (!inTemplate) {
       if (char === '{') {
           open++;
           // console.log(`+{ at line ${i+1}`);
       }
       if (char === '}') {
           open--;
           // console.log(`-} at line ${i+1}`);
       }
    }
  }
  
  if (open < 0) {
     console.log('Negative open at line', i+1, line);
     // break;
  }
}
console.log('Final open brackets:', open);
