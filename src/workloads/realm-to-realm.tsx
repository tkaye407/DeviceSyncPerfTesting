import * as Realm from "realm";
import * as readline from "node:readline";
import {
  addSubscriptionAndWait,
  askQuestionGetNum,
  deleteAllObjs,
  insertObjectsToRealm,
  printTimers,
} from "../utilities";
import {
  BasicDogAgeQuery,
  Dog,
  DogSchema,
  SignalDocumentName,
} from "../schemas";

/*
Realm To Realm 

Definition: 
  How long does a change made by one Realm client take to make it to another realm client.

Why Does it Matter: 
  This is important for collaborative apps in which you want to measure how quickly changes are sent between devices

How to test this: 
  1. Open two realms: Reader and Writer 
  2. Create a listener on the reader realm that will resolve when it receives a signal document 
  3. Insert N documents to the writer Realm such that the last document is the signal document
  4. When the listener resolves that means all of the documents have made it from the writer realm to the reader realm
*/
export async function RealmToRealm(
  writerRealm: Realm,
  readerRealm: Realm,
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
    // Ensure both Realms are clear
    await addSubscriptionAndWait(readerRealm, DogSchema.name, BasicDogAgeQuery);
    await addSubscriptionAndWait(writerRealm, DogSchema.name, BasicDogAgeQuery);
    await deleteAllObjs(readerRealm, DogSchema.name);
    await deleteAllObjs(writerRealm, DogSchema.name);

    // Initialize the listener on the reader realm
    let readerDogs = readerRealm.objects<Dog>(DogSchema.name);
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

    // Start the test
    const start = Date.now();

    // Write all of the objects (subtract 1 for the signal document)
    insertObjectsToRealm(
      writerRealm,
      numObjectsToInsert,
      numObjectsPerUpload,
      true
    );

    await readerDone;
    const end = Date.now();
    timers.push(end - start);
    console.log(`Iteration ${testNum} completed in ${end - start} ms`);
  }

  printTimers("realm-to-realm", timers);
  return;
}
