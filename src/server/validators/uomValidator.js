import "server-only";
import { z } from "zod";

export const createUomSchema = z.object({
  name: z.string().min(1).max(50),
  symbol: z.string().min(1).max(10),
  type: z.enum(["weight", "volume", "count", "length", "area", "time"]),
  isActive: z.boolean().optional(),
});

export const updateUomSchema = createUomSchema.partial();
