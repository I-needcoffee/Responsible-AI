import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourceRatingsTable = pgTable("source_ratings", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSourceRatingSchema = createInsertSchema(sourceRatingsTable).omit({ id: true, createdAt: true });
export type InsertSourceRating = z.infer<typeof insertSourceRatingSchema>;
export type SourceRating = typeof sourceRatingsTable.$inferSelect;
