import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { createPresignedUpload, deleteObject } from "../../lib/r2";

const router = Router();
router.use(requireAuth("admin"));

// POST /admin/upload/presign
// Frontend-с contentType авч presigned URL буцаана
// Frontend шууд R2 руу PUT хийнэ → ингэснээр том файл API дамжихгүй
router.post("/presign", async (req, res) => {
  const result = z
    .object({
      contentType: z.string().min(1),
      folder: z.string().default("products"),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "contentType шаардлагатай" },
    });
    return;
  }

  try {
    const { uploadUrl, publicUrl, key } = await createPresignedUpload(
      result.data.contentType,
      result.data.folder
    );
    res.json({ success: true, data: { uploadUrl, publicUrl, key } });
  } catch (e) {
    res.status(422).json({
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: e instanceof Error ? e.message : "Алдаа гарлаа",
      },
    });
  }
});

// DELETE /admin/upload
// Бүтэлгүйтсэн эсвэл устгасан үед R2-с файл арилгана
router.delete("/", async (req, res) => {
  const result = z.object({ key: z.string().min(1) }).safeParse(req.body);
  if (!result.success) {
    res
      .status(422)
      .json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "key шаардлагатай" },
      });
    return;
  }
  try {
    await deleteObject(result.data.key);
    res.json({ success: true, data: null });
  } catch {
    res
      .status(500)
      .json({
        success: false,
        error: { code: "DELETE_ERROR", message: "Файл устгахад алдаа гарлаа" },
      });
  }
});

export default router;
