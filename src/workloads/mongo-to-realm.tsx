import * as Realm from "realm";
import * as readline from "node:readline";
import {
  addSubscriptionAndWait,
  askQuestionGetNum,
  deleteAllObjs,
  printTimers,
  sleep,
} from "../utilities";
import {
  BasicDogAgeQuery,
  Dog,
  DogSchema,
  GetNewDog,
  SignalDocumentName,
} from "../schemas";

/* 
Mongo To Realm 

Definition: 
  How long it takes for a change made in Atlas to be sent to Realm client devices.

Why Does it Matter: 
  If you have a lot of administrative changes or an ETL job pushing data into MongoDB, 
  this defines how long it takes for that data to be propagated to the devices

How to test this: 
  1. Open a realm and create a listener that will resolve when it receives a signal document 
  2. Insert N documents into MongoDB Atlas directly using a driver (in this case the RemoteMongoClient built into the SDK)
    - The last document inserted will be the "signal" document
  3. When the listener resolves we know that the signal document has reached realm

Caveats: 
  1. This test's timing encompasses both how long it takes to insert to MongoDB and how long it takes for that document to reach the Realm device.
    - The Device Sync part of this should be the larger factor, but it is worth pointing out that there is some time baked into the results that are unrelated to Sync itself.
*/
export async function MongoToRealm(
  realm: Realm,
  collection: Realm.Services.MongoDB.MongoDBCollection<Dog>,
  readline: readline.Interface
) {
  let numTests = Number(
    await new Promise((resolve) => {
      readline.question(`Number of tests to run:  `, resolve);
    })
  );
  let numObjects = await askQuestionGetNum(
    readline,
    `Number objects to insert per test:  `
  );
  let numObjectsPerWrite = await askQuestionGetNum(
    readline,
    `Number objects to insert per write: `
  );

  let timers: number[] = [];
  await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);

  for (let testNum = 0; testNum < numTests; testNum++) {
    // Clear out realm
    await deleteAllObjs(realm, DogSchema.name);
    await sleep(1000);

    // Create a listener on the realm for the signal document to be inserted
    let readerDogs = realm.objects<Dog>(DogSchema.name);
    const readerDone = new Promise((resolve, reject) => {
      readerDogs.addListener(
        (objs: Realm.Collection<Dog>, changes: Realm.CollectionChangeSet) => {
          changes.insertions.forEach((index) => {
            if (objs[index].name == SignalDocumentName) {
              resolve("done");
            }
          });
        }
      );
    });

    // Start the timer
    const start = Date.now();
    let dogsToInsertInBatch: Dog[] = [];
    for (let i = 0; i < numObjects - 1; i++) {
      if (dogsToInsertInBatch.length >= numObjectsPerWrite) {
        await collection.insertMany(dogsToInsertInBatch);
        dogsToInsertInBatch = [];
      }

      let dogName = new Realm.BSON.ObjectId();
      dogsToInsertInBatch.push(GetNewDog(dogName.toHexString(), 12));
    }
    dogsToInsertInBatch.push(GetNewDog(SignalDocumentName, 12));
    await collection.insertMany(dogsToInsertInBatch);

    await readerDone;
    const end = Date.now();
    timers.push(end - start);
    console.log(`Iteration ${testNum} completed in ${end - start} ms`);
  }

  printTimers("mongo-to-realm", timers);
  return;
}
