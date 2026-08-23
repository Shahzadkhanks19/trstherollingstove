import mongoose from "mongoose";

import {
  connectToDatabase,
} from "../lib/db/mongoose";

async function main() {
  await connectToDatabase();

  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "MongoDB database is unavailable.",
    );
  }

  await database.command({
    ping: 1,
  });

  const collections =
    await database
      .listCollections(
        {},
        {
          nameOnly: true,
        },
      )
      .toArray();

  console.log(
    `MongoDB verification passed for "${database.databaseName}".`,
  );

  console.log(
    `${collections.length} collection(s) found.`,
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
