import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  downloadCertificate,
  verifyCertificate,
  getCertificateStatus,
} from "../controllers/certificate.js";

const router = express.Router();

// Public verification (no auth needed)
router.get("/certificate/verify/:certId", verifyCertificate);

// Must be BEFORE /:courseId to avoid "verify" being treated as a courseId
router.get("/certificate/:courseId/status", isAuth, getCertificateStatus);
router.get("/certificate/:courseId",        isAuth, downloadCertificate);

export default router;
