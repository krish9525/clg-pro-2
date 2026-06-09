import TryCatch from "../middlewares/TryCatch.js";
import { ok, created } from "../utils/response.js";
import * as resourceService from "../services/resourceService.js";

/** POST /api/v1/admin/lecture/:id/resource */
export const addResource = TryCatch(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  const resource = await resourceService.addResource(
    req.params.id,
    req.file,
    req.body.name
  );
  created(res, { resource }, "Resource uploaded successfully");
});

/** DELETE /api/v1/admin/lecture/:id/resource/:resourceId */
export const deleteResource = TryCatch(async (req, res) => {
  await resourceService.removeResource(req.params.id, req.params.resourceId);
  ok(res, null, "Resource deleted");
});

/** GET /api/v1/lecture/:id/resources — students */
export const getResources = TryCatch(async (req, res) => {
  const resources = await resourceService.getResources(req.params.id);
  ok(res, { resources });
});
