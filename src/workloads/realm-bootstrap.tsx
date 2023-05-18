import * as Realm from "realm";
import {
  addSubscriptionAndWait,
  askQuestionGetNum,
  deleteAllObjs,
  insertObjectsToRealm,
  printTimers,
  removeAllSubscriptionsAndWait,
  sleep,
} from "../utilities";
import { BasicDogAgeQuery, DogSchema } from "../schemas";
import * as readline from "node:readline";

/* 
Realm Bootstrap 

Definition: 
  How long it takes for a subscription to be fully loaded 

Why Does it Matter: 
  This might represent how long it takes when the application is first opened to get the relevant data from Atlas Device Sync

How to test this: 
  1. Add some initial data to seed the cluster
  2. Remove the subscription from the client and wait for the subscription change to complete
  3. Time how long it takes to re-add a subscription and download all relevant state from the server

Caveats: 
  1. The bootstrap is very much a function of how much data is in your cluster, what your subscription looks like, and how much data you are trying to sync.
*/
export async function RealmBootstrap(
  realm: Realm,
  readline: readline.Interface
) {
  let numTests = await askQuestionGetNum(readline, `Number of tests to run:  `);
  let numObjectsToInsert = await askQuestionGetNum(
    readline,
    `Number objects to insert per test:  `
  );

  await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);
  await deleteAllObjs(realm, DogSchema.name);
  await sleep(1000);

  insertObjectsToRealm(realm, numObjectsToInsert, 100, false);
  await realm.syncSession?.uploadAllLocalChanges();

  let timers: number[] = [];

  for (let testNum = 0; testNum < numTests; testNum++) {
    await removeAllSubscriptionsAndWait(realm);
    const start = Date.now();
    await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);
    const end = Date.now();
    timers.push(end - start);
    console.log(`Iteration ${testNum} completed in ${end - start} ms`);
  }

  printTimers("realm-bootstrap", timers);
  return;
}
