// Upload a file (File/Blob/ArrayBuffer) to Cloudinary via REST API
export async function uploadToCloudinary(fileBlob, fileName, env, folder = "elearning") {
  const timestamp = Math.floor(Date.now() / 1000);
  const strToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_SECRET}`;

  const msgBuffer = new TextEncoder().encode(strToSign);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const form = new FormData();
  form.append("file", fileBlob, fileName);
  form.append("api_key", env.CLOUDINARY_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: form }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Cloudinary upload failed");

  return data.secure_url; // full https URL
}
