const fs = require('fs');
const p = 'components/wizard/DimensionsStep.tsx';
let txt = fs.readFileSync(p, 'utf-8');
const search = '        {(\n' +
'          [\n' +
'            { name: "width_m", label: "Width", hint: "2 – 12 m" },\n' +
'            { name: "length_m", label: "Length", hint: "2 – 12 m" },\n' +
'            { name: "height_m", label: "Height", hint: "2.2 – 4 m", step: "0.1" },\n' +
'          ] as const\n' +
'        ).map(({ name, label, hint, ...rest }) => (';

const replacement = '        {(\n' +
'          [\n' +
'            { name: "width_m", label: "Width" },\n' +
'            { name: "length_m", label: "Length" },\n' +
'            { name: "height_m", label: "Height", step: "0.1" },\n' +
'          ] as const\n' +
'        ).map(({ name, label, ...rest }) => {\n          const fieldBounds = bounds[name];\n          return (';

txt = txt.replace(search, replacement);
txt = txt.replace('{hint}', '{fieldBounds[0]} - {fieldBounds[1]} m');
let lines = txt.split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('))}')) {
        lines[i] = lines[i].replace('))}', ')})}');
        break;
    }
}
fs.writeFileSync(p, lines.join('\n'), 'utf-8');
console.log('Fixed');
