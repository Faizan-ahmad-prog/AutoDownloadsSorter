const DownloadsSorter = require('./sorter');
const path = require('path');

const sorter = new DownloadsSorter();

const args = process.argv.slice(2);

if (args.includes('--all')) {
  sorter.sortExistingDownloads().then(records => {
    console.log(JSON.stringify({ status: 'success', count: records.length, records: records }));
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else if (args.length > 0) {
  const targetFile = args[0];
  sorter.processFile(targetFile).then(record => {
    console.log(JSON.stringify({ status: 'success', record: record }));
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.log('Usage: node sorter-cli.js [--all | <filepath>]');
  process.exit(0);
}
