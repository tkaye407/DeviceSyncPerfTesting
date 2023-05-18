# Device Sync Performance Testing Script

Please see this article: https://medium.com/@tkaye407/atlas-device-sync-defining-and-measuring-performance-3b3ef9fdac45

Testing the performance of Device Sync has typically been a daunting task. On top of the fact that it is difficult to
define what performance means exactly, there are a lot of factors that affect that performance.

This repository is intended to serve as a jumping off point to begin testing the performance of Device Sync.
You can run it without any changes, or you can update the code to be more in line with what you want to test.

## What does performance mean for Atlas Device Sync (ADS)

### Latency vs. Throughput

When speaking about performance, the first thing to highlight is the difference between throughput and latency

- Latency: The time it takes for changes to propagate through the system
- Throughput: The amount of data that can propagate through the system

ADS strives to be real-time, however there are many design decisions made that prioritize throughput over latency.

### Types of Performance

Performance for ADS is a hard thing to define, let alone measure.

The first thing to think about when you are looking to test the performance of ADS is to hone in on what exactly it is that you want to test.

This can include things like:

1. Realm To Realm: Change propagating from one device to another
2. Realm To Mongo: Change propagating to MongoDB
3. Mongo To Realm: MongoDB write propagating to device
4. Bootstrap: Subscribing to a query and receiving the initial state
5. Initial Sync: Turning on sync for the first time and populating the necessary metadata
6. Load: How many clients are able to connect to ADS and upload changes at the same time

This repository exposes ways to test each of these things.

## Running the tests:

1. Set up your Atlas Cluster and App Service. [Click here](https://www.mongodb.com/docs/atlas/app-services/manage-apps/create/create-with-ui/) to see how you can do that through the UI.
2. [Enable sync](https://www.mongodb.com/docs/atlas/app-services/sync/configure/enable-sync/). Make sure to enable Development Mode, use fully open permissions, and deploy changes to the app.
3. Copy your app id. This will be found in the top-left section of the UI.
4. Download packages by running `npm install` from this directory.
5. Run app using `npm run start`

Following the above steps will open a cli-mode that will let you interact with the tool as such:

```
▶ npm start

Ensure that Flexible Sync is enabled and developer mode is turned on.
Enter your App Services App ID:  *************
Enter developer mode database name:  PerfDB
Initializing connection and syncing up schemas and queryable fields. Might take a few seconds

*************************
Select a number:
(1) Realm to Realm
(2) Mongo to Realm
(3) Realm to Mongo
(4) Realm Bootstrap
(5) Exit
*************************


Select number for test you want to run: 1
Number of tests to run:  5
Number objects to insert per test:  100
Number objects to insert per write: 20
Iteration 0 completed in 1300 ms
Iteration 1 completed in 3390 ms
Iteration 2 completed in 2974 ms
Iteration 3 completed in 3019 ms
Iteration 4 completed in 3042 ms

Results:
	{ test: realm-to-realm, min: 1300, max: 3390, avg: 2745 }
```

Note that we will run the tests multiple times if specified and output the minimum, maximum, and average time taken.

### Passing in arguments to the tool directly

If you are using the tool and want to avoid pasting the ClientAppId and DevMode Database name, you can run the following:

```
▶ npm start  -- clientAppId=************ databaseName=PerfDB
```

## Running the Load Tests

We have included a bash script `load.sh` that can be used to simulate several processes connecting to sync and uploading changes at the same time.

Please be careful interpretting these results. If you try to simulate more than 5-10 clients on a single machine it will likely be your machine that is the bottleneck.

```
sh load.sh  client-app-id  5
```

## Updating this code

Please feel free to download this code and update it freely. Things you might want to do include:

1. Update the schema being used to more closely resemble your data models. This can be found in `src/schemas.tsx`.
2. Update the subscription (query) being used (see `src/schemas.tsx`).
   - When doing this, make sure to not end up in a situation where the workloads are generating objects outside of these subscription bounds as this will lead to compensating writes.
3. Update any of the test workloads to more closely resemble your workload (types of updates, etc).
