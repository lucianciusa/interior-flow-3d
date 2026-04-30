const fs = require('fs');
const path = require('path');
const validator = require('gltf-validator');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: gltf-validator <input> [-r] [-o <output_dir>]');
        process.exit(1);
    }

    const inputPath = args[0];
    let outputDir = '.';
    
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '-o' && args[i+1]) {
            outputDir = args[i+1];
            i++;
        }
    }

    try {
        const data = fs.readFileSync(inputPath);
        const report = await validator.validateBytes(new Uint8Array(data), {
            uri: path.basename(inputPath),
            externalResourceFunction: (uri) => {
                return new Promise((resolve, reject) => {
                    const fullPath = path.resolve(path.dirname(inputPath), decodeURIComponent(uri));
                    fs.readFile(fullPath, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            }
        });

        const stem = path.basename(inputPath, path.extname(inputPath));
        const reportPath = path.join(outputDir, `${stem}_report.json`);
        
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`Validation report written to ${reportPath}`);
    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    }
}

main();
