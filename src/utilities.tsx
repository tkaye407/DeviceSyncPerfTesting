import * as Realm from "realm";
import { DogSchema, GetNewDog, SignalDocumentName } from "./schemas";
import * as readline from "node:readline";

export const cliPrompt = `
*************************
Select a number:
(1) Realm to Realm
(2) Mongo to Realm
(3) Realm to Mongo
(4) Realm Bootstrap
(5) Exit
*************************\n\n`;

export async function askQuestion(
  readline: readline.Interface,
  question: string
): Promise<string> {
  return await new Promise((resolve) => {
    readline.question(question, resolve);
  });
}

export async function askQuestionGetNum(
  readline: readline.Interface,
  prompt: string
): Promise<number> {
  const answer = await askQuestion(readline, prompt);
  return parseInt(answer, 10);
}

export async function getRealmApplicationAndLogin(
  clientAppID: string
): Promise<Realm.App> {
  let app = new Realm.App({
    id: clientAppID,
  });

  const credentials = Realm.Credentials.anonymous();
  await app.logIn(credentials);
  return app;
}

export async function getFlexibleRealm(
  app: Realm.App,
  schemas: Realm.ObjectSchema[]
): Promise<Realm> {
  const cfg: Realm.FlexibleSyncConfiguration = {
    user: app.currentUser!,
    flexible: true,
  };

  // Define a randomized path where the realm will live
  let realmPath = new Realm.BSON.ObjectId();
  const config = {
    schema: schemas,
    sync: cfg,
    path: "realms/" + realmPath.toHexString(),
  };

  return Realm.open(config);
}

export async function removeAllSubscriptionsAndWait(realm: Realm) {
  const subs = realm.subscriptions;
  await subs.update((mutableSubs) => {
    mutableSubs.removeAll();
  });
  await subs.waitForSynchronization();
}

export async function addSubscriptionAndWait(
  realm: Realm,
  table: string,
  query: string
) {
  const subs = realm.subscriptions;

  await subs.update((mutableSubs) => {
    // Clear out any subscriptions that may have been added
    // in a previous execution
    mutableSubs.removeAll();
    mutableSubs.add(realm.objects(table).filtered(query));
  });
  await subs.waitForSynchronization();
}

export async function deleteAllObjs(realm: Realm, table: string) {
  realm.write(() => {
    realm.deleteAll();
  });
  await realm.syncSession?.uploadAllLocalChanges();
}

export function insertObjectsToRealm(
  realm: Realm,
  numObjectsToInsert: number,
  numObjectsPerUpload: number,
  includeSignalDocument: boolean
) {
  if (numObjectsToInsert === 0) {
    return;
  }

  realm.beginTransaction();
  for (let i = 1; i <= numObjectsToInsert; i++) {
    if (i % numObjectsPerUpload === 0) {
      if (realm.isInTransaction) {
        realm.commitTransaction();
      }
      realm.beginTransaction();
    }

    let objectName = new Realm.BSON.ObjectId().toHexString();
    if (i == numObjectsToInsert && includeSignalDocument) {
      objectName = SignalDocumentName;
    }
    realm.create(DogSchema.name, GetNewDog(objectName, 12));
  }
  if (realm.isInTransaction) {
    realm.commitTransaction();
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printTimers(testName: string, timers: number[]) {
  let min = Math.min(...timers);
  let max = Math.max(...timers);
  let total = 0;

  timers.forEach(function (item, index) {
    total += item;
  });

  console.log(
    `\nResults: \n\t{ test: ${testName}, min: ${min}, max: ${max}, avg: ${
      total / timers.length
    } }\n`
  );
}
