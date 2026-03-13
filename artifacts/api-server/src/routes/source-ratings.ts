import { Router, type IRouter } from "express";
import { db, sourceRatingsTable } from "@workspace/db";
import { RateSourceBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/source-ratings", async (_req, res) => {
  try {
    const ratings = await db.select().from(sourceRatingsTable);
    res.json(ratings);
  } catch (err) {
    console.error("Failed to fetch source ratings:", err);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

router.post("/source-ratings", async (req, res) => {
  try {
    const parsed = RateSourceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { sourceId, rating, comment } = parsed.data;
    const [created] = await db
      .insert(sourceRatingsTable)
      .values({ sourceId, rating, comment: comment ?? null })
      .returning();
    res.json(created);
  } catch (err) {
    console.error("Failed to save source rating:", err);
    res.status(500).json({ error: "Failed to save rating" });
  }
});

export default router;
