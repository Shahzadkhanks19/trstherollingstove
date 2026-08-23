import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReviewHelpfulVoteSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

ReviewHelpfulVoteSchema.index(
  { reviewId: 1, userId: 1 },
  { unique: true },
);

export type ReviewHelpfulVoteDocument = InferSchemaType<
  typeof ReviewHelpfulVoteSchema
>;

export const ReviewHelpfulVote: Model<ReviewHelpfulVoteDocument> =
  (models.ReviewHelpfulVote as Model<ReviewHelpfulVoteDocument>) ||
  model<ReviewHelpfulVoteDocument>(
    "ReviewHelpfulVote",
    ReviewHelpfulVoteSchema,
  );
