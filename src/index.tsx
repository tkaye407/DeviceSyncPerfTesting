import * as Realm from "realm";
import { BasicDogAgeQuery, Dog, DogSchema } from "./schemas";
import {
  addSubscriptionAndWait,
  askQuestion,
  getRealmApplicationAndLogin,
  getFlexibleRealm,
  removeAllSubscriptionsAndWait,
  cliPrompt,
} from "./utilities";
import { RealmUploadAndWait } from "./workloads/realm-upload";
import { RealmToRealm } from "./workloads/realm-to-realm";
import { MongoToRealm } from "./workloads/mongo-to-realm";
import { RealmToMongo } from "./workloads/realm-to-mongo";
import { RealmBootstrap } from "./workloads/realm-bootstrap";

import * as readline from "node:readline";
const rl = readline.createInterface(process.stdin, process.stdout);

// Can update any of these to remove the need for passing in options
let clientAppId = "";
let isMultipleClientTest = false;
let databaseName = "";

// Update this to send in a different schema (or set of schemas) to the test realms
let realmSchemas: Realm.ObjectSchema[] = [DogSchema];

async function uploadAndAcknowlegeTest() {
  const app = await getRealmApplicationAndLogin(clientAppId);
  const realm = await getFlexibleRealm(app, realmSchemas);

  let start = Date.now();
  await RealmUploadAndWait(realm, 1000, 10);
  let end = Date.now();
  console.log(`Client completed test in ${end - start} ms`);
}

async function main() {
  if (isMultipleClientTest) {
    await uploadAndAcknowlegeTest();
    return;
  }

  console.log(
    "Ensure that Flexible Sync is enabled and developer mode is turned on."
  );
  if (clientAppId == "") {
    clientAppId = await askQuestion(rl, `Enter your App Services App ID:  `);
  }
  if (databaseName == "") {
    databaseName = await askQuestion(
      rl,
      `Enter developer mode database name:  `
    );
  }

  // Initialize the Realm and connect to Atlas Device Sync to exchange schemas and queryable fields
  console.log(
    "Initializing connection and syncing up schemas and queryable fields. Might take a few seconds"
  );
  const app = await getRealmApplicationAndLogin(clientAppId);
  const realm = await getFlexibleRealm(app, realmSchemas);
  await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);
  await removeAllSubscriptionsAndWait(realm);

  // Get the remote MongoDB collection
  let dogsCollection = app.currentUser
    ?.mongoClient("mongodb-atlas")
    .db(databaseName as string)
    .collection<Dog>(DogSchema.name)!;

  // Prompt for which kind of test to run
  while (true) {
    console.log(cliPrompt);

    const strInput = await askQuestion(
      rl,
      `Select number for test you want to run: `
    );

    let shouldExit = false;

    switch (strInput) {
      case "1":
        let readerRealm = await getFlexibleRealm(app, realmSchemas);
        await RealmToRealm(realm, readerRealm, rl);
        break;
      case "2":
        await MongoToRealm(realm, dogsCollection, rl);
        break;
      case "3":
        await RealmToMongo(realm, dogsCollection, rl);
        break;
      case "4":
        await RealmBootstrap(realm, rl);
        break;
      case "5":
        console.log("See you later!");
        shouldExit = true;
        break;
      default:
        console.log("Invalid input: " + strInput);
    }

    if (shouldExit) {
      break;
    }
  }
  realm.close();
}

// Get test args passed into the npm command directly to avoid interaction if desired
let testArgs = process.argv.splice(2, process.argv.length - 1);
isMultipleClientTest = testArgs.includes("multipleClientTest");
for (const testArg of testArgs) {
  let splitString = testArg.split("=");
  if (splitString.length != 2 && testArg != "multipleClientTest") {
    throw "Expected to find option with a key and value (example: foo=bar)";
  }

  switch (splitString[0]) {
    case "clientAppId":
      clientAppId = splitString[1];
      break;
    case "databaseName":
      databaseName = splitString[1];
      break;
    case "multipleClientTest":
      isMultipleClientTest = true;
      break;
    default:
      throw "Found unknown option. Valid options are `clientAppId`, `databaseName`, and `mutlipleClientTest`";
  }
}

main()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
