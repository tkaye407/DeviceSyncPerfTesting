// Our sample schema will be a "Dog" with a breed, name, age, color, and country
export type Dog = {
  _id: Realm.BSON.ObjectId;
  breed?: string;
  name: string;
  age?: number;
  color?: string;
  country?: string;
};

export const DogSchema = {
  name: "Dog",
  properties: {
    _id: "objectId",
    breed: "string?",
    name: "string",
    age: "int?",
    color: "string?",
    country: "string?",
  },
  primaryKey: "_id",
};

// Define a function that returns a new "Dog" given a name and age
export function GetNewDog(name: string, age: number): Dog {
  const objID = new Realm.BSON.ObjectId();
  return {
    _id: objID,
    breed: "french bulldog",
    name: name,
    age: age,
    color: "black",
    country: "united states",
  };
}

export const SignalDocumentName = "fido";
export const BasicDogAgeQuery = "age < 50";
