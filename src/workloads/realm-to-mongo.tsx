import * as Realm from "realm";
import * as readline from "node:readline";
import {
  addSubscriptionAndWait,
  askQuestionGetNum,
  deleteAllObjs,
  insertObjectsToRealm,
  printTimers,
  sleep,
} from "../utilities";
import {
  BasicDogAgeQuery,
  Dog,
  DogSchema,
  SignalDocumentName,
} from "../schemas";

/*
Realm To Mongo 

Definition: 
  How long it takes for a change made by one Realm client to make it to MongoDB Atlas.

Why Does it Matter: 
  If you have other consumers of the application using web-clients, or perhaps a trigger executing custom function logic, 
  this is how quickly this write will be visible in Atlas

How to test this: 
  1. Open a MongoDB Change Stream on the collection (using the watch api) to resolve when the signal document is inserted
  2. Insert N documents to the synced Realm such that the last document is the signal document
  3. When the change stream resolves that means all of the documents have made it to Atlas

Caveats: 
  1. This test's timing encompasses both how long it takes for the Realm writes to make it to Atlas as well as how long it takes for the last 
  write to make it back to the device through the change stream. There is some additional latency in this last part that could affect the test 
  results, especially if you are testing a small document count. 
*/
export async function RealmToMongo(
  realm: Realm,
  collection: Realm.Services.MongoDB.MongoDBCollection<Dog>,
  readline: readline.Interface
) {
  let numTests = await askQuestionGetNum(readline, `Number of tests to run:  `);
  let numObjectsToInsert = await askQuestionGetNum(
    readline,
    `Number objects to insert per test:  `
  );
  let numObjectsPerUpload = await askQuestionGetNum(
    readline,
    `Number objects to insert per write: `
  );

  let timers: number[] = [];

  for (let testNum = 0; testNum < numTests; testNum++) {
    // Clear the realm
    await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);
    await deleteAllObjs(realm, DogSchema.name);
    await sleep(1000);

    // Open a change stream waiting for the signal document
    const readerDone = new Promise((resolve, reject) => {
      let filter = {
        operationType: "insert",
        "fullDocument.name": SignalDocumentName,
      };
      let cs = collection.watch({ filter: filter });
      cs.next().then((event) => {
        if ((event.value.fullDocument.name = SignalDocumentName)) {
          resolve("done");
          return;
        }
      });
    });

    // Start the test
    const start = Date.now();

    // Write to the realm
    insertObjectsToRealm(realm, numObjectsToInsert, numObjectsPerUpload, true);

    // Wait for the change stream signal to come through
    await readerDone;
    const end = Date.now();
    timers.push(end - start);
    console.log(`Iteration ${testNum} completed in ${end - start} ms`);
  }

  printTimers("realm-to-mongo", timers);

  return;
}
