import * as Realm from "realm";
import { addSubscriptionAndWait, insertObjectsToRealm } from "../utilities";
import { BasicDogAgeQuery, DogSchema } from "../schemas";

/*
Realm Upload

Definition: 
  Connect to sync, add a subscription, and upload some changes to Atlas Device Sync.

Why Does it Matter: 
  This test is intended to be used to load test the server with many clients. See the README for more details. 

How to test this: 
  1. Add a subscription to the Realm and wait for it to download all relevant changes 
  2. Insert N objects into Realm and wait for Device Sync to acknowledge them

Caveats: 
  1. This test should ideally be used in a distributed situation. Running it 1000 times on a laptop will just point 
  out that the bottleneck is in running 1000 synced realms on the same machine and not anything to do with the service itself. 
*/
export async function RealmUploadAndWait(
  realm: Realm,
  numObjectsToInsert: number,
  numObjectsPerUpload: number
) {
  // Initialize the Realm and connect to Atlas Device Sync to exchange schemas and queryable fields
  await addSubscriptionAndWait(realm, DogSchema.name, BasicDogAgeQuery);

  // Write all of the objects
  insertObjectsToRealm(realm, numObjectsToInsert, numObjectsPerUpload, false);

  await realm.syncSession?.uploadAllLocalChanges();

  realm.close();
}
