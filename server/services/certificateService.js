import { randomBytes }  from "crypto";
import PDFDocument      from "pdfkit";
import { Progress }     from "../models/Progress.js";
import { Courses }      from "../models/Courses.js";
import { Lecture }      from "../models/Lecture.js";
import { User }         from "../models/User.js";

// ─── Check & award certificate ────────────────────────────────────────────────

/**
 * Called after every lecture completion.
 * If all lectures are done → award certificate and return the Progress doc.
 */
export const checkAndAwardCertificate = async (userId, courseId) => {
  const [progress, totalLectures] = await Promise.all([
    Progress.findOne({ user: userId, course: courseId }),
    Lecture.countDocuments({ course: courseId }),
  ]);

  if (!progress || totalLectures === 0) return null;
  if (progress.certificateEarned) return progress; // already awarded

  const completedCount = progress.completedLectures.length;
  if (completedCount < totalLectures) return null;

  // All done — award certificate
  progress.certificateEarned   = true;
  progress.certificateEarnedAt = new Date();
  progress.certificateId       = `CERT-${randomBytes(6).toString("hex").toUpperCase()}`;
  await progress.save();
  return progress;
};

// ─── Generate PDF certificate ─────────────────────────────────────────────────

export const generateCertificatePDF = async (userId, courseId) => {
  const [progress, user, course] = await Promise.all([
    Progress.findOne({ user: userId, course: courseId }),
    User.findById(userId).select("name email"),
    Courses.findById(courseId).select("title createdBy"),
  ]);

  if (!progress?.certificateEarned) {
    const e = new Error("Certificate not earned yet — complete all lectures first.");
    e.statusCode = 403; throw e;
  }

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    const chunks = [];

    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   ()  => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;  // 841
    const H = doc.page.height; // 595

    // ─── Background gradient simulation ────────────────────────────────────────
    doc.rect(0, 0, W, H).fill("#0f0c29");
    doc.rect(0, 0, W, 8).fill("#7c3aed");
    doc.rect(0, H - 8, W, 8).fill("#7c3aed");

    // ─── Decorative border ──────────────────────────────────────────────────────
    doc.rect(30, 30, W - 60, H - 60)
       .lineWidth(2)
       .strokeColor("#7c3aed")
       .stroke();

    // ─── Logo / header ──────────────────────────────────────────────────────────
    doc.fillColor("#7c3aed")
       .fontSize(14)
       .font("Helvetica-Bold")
       .text("🎓 EduLearn", 0, 55, { align: "center" });

    doc.fillColor("#e2e8f0")
       .fontSize(36)
       .font("Helvetica-Bold")
       .text("Certificate of Completion", 0, 90, { align: "center" });

    doc.fillColor("#94a3b8")
       .fontSize(14)
       .font("Helvetica")
       .text("This is to certify that", 0, 150, { align: "center" });

    // ─── Student name ───────────────────────────────────────────────────────────
    doc.fillColor("#ffffff")
       .fontSize(42)
       .font("Helvetica-BoldOblique")
       .text(user.name, 0, 175, { align: "center" });

    // ─── Underline ──────────────────────────────────────────────────────────────
    const nameWidth = doc.widthOfString(user.name, { fontSize: 42 });
    const nameX     = (W - Math.min(nameWidth, W - 120)) / 2;
    doc.moveTo(nameX, 228).lineTo(W - nameX, 228).lineWidth(1).strokeColor("#7c3aed").stroke();

    // ─── Course ─────────────────────────────────────────────────────────────────
    doc.fillColor("#94a3b8")
       .fontSize(14)
       .font("Helvetica")
       .text("has successfully completed the course", 0, 245, { align: "center" });

    doc.fillColor("#7c3aed")
       .fontSize(24)
       .font("Helvetica-Bold")
       .text(`"${course.title}"`, 60, 270, { align: "center", width: W - 120 });

    doc.fillColor("#94a3b8")
       .fontSize(12)
       .font("Helvetica")
       .text(`Instructor: ${course.createdBy}`, 0, 320, { align: "center" });

    // ─── Footer ─────────────────────────────────────────────────────────────────
    const earnedDate = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    }).format(new Date(progress.certificateEarnedAt));

    doc.fillColor("#64748b")
       .fontSize(11)
       .text(`Date of Completion: ${earnedDate}`, 80, 390)
       .text(`Certificate ID: ${progress.certificateId}`, 80, 408);

    doc.fillColor("#64748b")
       .fontSize(11)
       .text("Authorized by", W - 200, 390, { align: "center", width: 120 })
       .moveTo(W - 200, 420).lineTo(W - 80, 420).lineWidth(1).strokeColor("#475569").stroke()
       .fillColor("#94a3b8").fontSize(10)
       .text("EduLearn Platform", W - 200, 425, { align: "center", width: 120 });

    doc.end();
  });
};

// ─── Verify certificate by ID ─────────────────────────────────────────────────

export const verifyCertificate = async (certificateId) => {
  const progress = await Progress
    .findOne({ certificateId })
    .populate("user",   "name email")
    .populate("course", "title createdBy");

  if (!progress) {
    const e = new Error("Certificate not found or invalid"); e.statusCode = 404; throw e;
  }

  return {
    certificateId:       progress.certificateId,
    studentName:         progress.user.name,
    studentEmail:        progress.user.email,
    courseTitle:         progress.course.title,
    instructor:          progress.course.createdBy,
    completionDate:      progress.certificateEarnedAt,
    valid:               true,
  };
};
