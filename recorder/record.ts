import { mkdir, writeFile } from 'node:fs/promises';

const path = process.argv[2];
const url = process.argv[3];
const seconds = parseInt(process.argv[4]);
let lastContent = '';

async function main() {
  await mkdir(path, { recursive: true });
  await fetchPeriodically();
}

async function fetchPeriodically() {
  const file = `${path}/${dateString()}`;
  try {
  const res = await fetch(url);
  const content = await res.text();
  if (content != lastContent) {
    lastContent = content;
    await writeFile(file, content);
    console.log(`\n\n${file}\n\n`);
    console.log(content);
    console.log('----------------------------------------------------------');
  }
  } catch (e) {
    console.error(e.message);
    await writeFile(file + '.error', e.message);
  }
  await sleep(seconds * 1000);
  await fetchPeriodically();
}

const dateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}_${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

main();
