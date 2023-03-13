import {
  establishConnection,
  establishPayer,
  checkProgram,
  readState,
  reset,
  setOracles,
  vote,
} from './inheritable_test';

async function main() {
  await establishConnection();

  await establishPayer();

  await checkProgram();

  //await reset();

  //await setOracles();

  //await vote();

  let reply = await readState();
  console.log(JSON.stringify(reply))

  console.log('Success');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
