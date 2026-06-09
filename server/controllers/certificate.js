import TryCatch from "../middlewares/TryCatch.js";
import { ok }   from "../utils/response.js";
import * as certService from "../services/certificateService.js";

/** GET /api/v1/certificate/:courseId — download PDF */
export const downloadCertificate = TryCatch(async (req, res) => {
  const pdfBuffer = await certService.generateCertificatePDF(
    req.user._id,
    req.params.courseId
  );

  res.set({
    "Content-Type":        "application/pdf",
    "Content-Disposition": `attachment; filename="certificate-${req.params.courseId}.pdf"`,
    "Content-Length":      pdfBuffer.length,
  });
  res.end(pdfBuffer);
});

/** GET /api/v1/certificate/verify/:certId — public verification endpoint */
export const verifyCertificate = TryCatch(async (req, res) => {
  const info = await certService.verifyCertificate(req.params.certId);
  ok(res, info, "Certificate is valid ✅");
});

/** GET /api/v1/certificate/:courseId/status — check if earned */
export const getCertificateStatus = TryCatch(async (req, res) => {
  const { Progress } = await import("../models/Progress.js");
  const progress = await Progress.findOne({
    user:   req.user._id,
    course: req.params.courseId,
  }).select("certificateEarned certificateEarnedAt certificateId");

  ok(res, {
    earned:    progress?.certificateEarned    ?? false,
    earnedAt:  progress?.certificateEarnedAt  ?? null,
    certId:    progress?.certificateId        ?? null,
  });
});
