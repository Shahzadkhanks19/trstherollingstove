import mongoose from "mongoose";
import type {
  Collection,
  Document,
} from "mongodb";

function getCollection(
  name: string,
): Collection<Document> {
  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "Database connection is not ready.",
    );
  }

  return database.collection(name);
}

function numberValue(
  value: unknown,
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function stringValue(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

export async function getPublicHomeData() {
  const [
    categories,
    featuredItems,
    offers,
    reviews,
    homepage,
    settings,
  ] = await Promise.all([
    getCollection("menucategories")
      .find({
        isActive: true,
        deletedAt: null,
      })
      .sort({
        sortOrder: 1,
        name: 1,
      })
      .limit(12)
      .toArray(),
    getCollection("menuitems")
      .find({
        isActive: true,
        isAvailable: true,
        isFeatured: true,
        deletedAt: null,
      })
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .limit(12)
      .toArray(),
    getCollection("coupons")
      .find({
        isActive: true,
        deletedAt: null,
        startsAt: {
          $lte: new Date(),
        },
        expiresAt: {
          $gte: new Date(),
        },
      })
      .sort({
        createdAt: -1,
      })
      .limit(8)
      .toArray(),
    getCollection("reviews")
      .find({
        status: "approved",
        isVisible: {
          $ne: false,
        },
      })
      .sort({
        isFeatured: -1,
        createdAt: -1,
      })
      .limit(8)
      .toArray(),
    getCollection("homepages")
      .findOne({
        isActive: {
          $ne: false,
        },
      }),
    getCollection("settings")
      .findOne({
        section: "business",
      }),
  ]);

  return {
    categories,
    featuredItems,
    offers,
    reviews,
    homepage: homepage ?? {},
    business: settings?.value ?? {},
  };
}

export async function getPublicMenu(
  input: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
    featured?: boolean;
    bestseller?: boolean;
  },
) {
  const filter: Record<string, unknown> = {
    isActive: true,
    isAvailable: true,
    deletedAt: null,
  };

  if (input.category) {
    filter.categorySlug =
      input.category;
  }

  if (input.featured !== undefined) {
    filter.isFeatured =
      input.featured;
  }

  if (input.bestseller !== undefined) {
    filter.isBestseller =
      input.bestseller;
  }

  if (input.search) {
    const regex = {
      $regex: input.search,
      $options: "i",
    };

    filter.$or = [
      { name: regex },
      { description: regex },
      { tags: regex },
    ];
  }

  const skip =
    (input.page - 1) * input.limit;

  const collection =
    getCollection("menuitems");

  const [items, total] =
    await Promise.all([
      collection
        .find(filter)
        .sort({
          sortOrder: 1,
          name: 1,
        })
        .skip(skip)
        .limit(input.limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(
        total / input.limit,
      ),
    },
  };
}

export async function getPublicMenuItem(
  slug: string,
) {
  return getCollection("menuitems")
    .findOne({
      slug,
      isActive: true,
      deletedAt: null,
    });
}

export async function getPublicCategories() {
  return getCollection("menucategories")
    .find({
      isActive: true,
      deletedAt: null,
    })
    .sort({
      sortOrder: 1,
      name: 1,
    })
    .toArray();
}

export async function getPublicOffers() {
  const now = new Date();

  return getCollection("coupons")
    .find({
      isActive: true,
      deletedAt: null,
      startsAt: {
        $lte: now,
      },
      expiresAt: {
        $gte: now,
      },
      visibility: {
        $ne: "private",
      },
      $or: [
        { couponChannel: "public_offer" },
        { couponChannel: { $exists: false } },
      ],
    })
    .sort({
      createdAt: -1,
    })
    .toArray();
}

export async function getPublicReviews(
  input: {
    page: number;
    limit: number;
    rating?: number;
  },
) {
  const filter: Record<string, unknown> = {
    status: "approved",
    isVisible: {
      $ne: false,
    },
  };

  if (input.rating !== undefined) {
    filter.rating = input.rating;
  }

  const skip =
    (input.page - 1) * input.limit;

  const collection =
    getCollection("reviews");

  const [items, total] =
    await Promise.all([
      collection
        .find(filter)
        .sort({
          isFeatured: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(input.limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

  const ratingSummary =
    await collection
      .aggregate<Document>([
        {
          $match: {
            status: "approved",
            isVisible: {
              $ne: false,
            },
          },
        },
        {
          $group: {
            _id: null,
            averageRating: {
              $avg: "$rating",
            },
            totalReviews: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  const summary =
    ratingSummary[0] ?? {};

  return {
    items,
    summary: {
      averageRating: Number(
        numberValue(
          summary.averageRating,
        ).toFixed(2),
      ),
      totalReviews:
        numberValue(
          summary.totalReviews,
        ),
    },
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(
        total / input.limit,
      ),
    },
  };
}

export async function getPublicFaqs() {
  return getCollection("faqs")
    .find({
      isActive: {
        $ne: false,
      },
    })
    .sort({
      sortOrder: 1,
      createdAt: 1,
    })
    .toArray();
}

export async function getPublicGallery(
  input: {
    page: number;
    limit: number;
    category?: string;
  },
) {
  const filter: Record<string, unknown> = {
    isPublished: true,
  };

  if (input.category) {
    filter.category =
      input.category;
  }

  const skip =
    (input.page - 1) * input.limit;

  const collection =
    getCollection("galleryitems");

  const [items, total] =
    await Promise.all([
      collection
        .find(filter)
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(input.limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(
        total / input.limit,
      ),
    },
  };
}

export async function getPublicPage(
  slug: string,
) {
  return getCollection("cmspages")
    .findOne({
      slug,
      isActive: {
        $ne: false,
      },
    });
}

export async function getPublicBusinessSettings() {
  const document =
    await getCollection("settings")
      .findOne({
        section: "business",
      });

  return document?.value ?? {};
}

export async function createContactSubmission(
  input: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  },
) {
  const result =
    await getCollection(
      "contactmessages",
    ).insertOne({
      ...input,
      status: "new",
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  return {
    id: String(result.insertedId),
  };
}

export async function getPublicSiteMetadata() {
  const settings =
    await getCollection("settings")
      .find({
        section: {
          $in: [
            "business",
            "seo",
            "social",
          ],
        },
      })
      .toArray();

  const result: Record<
    string,
    unknown
  > = {};

  for (const setting of settings) {
    const section =
      stringValue(setting.section);

    if (section) {
      result[section] =
        setting.value ?? {};
    }
  }

  return result;
}
