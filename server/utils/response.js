/**
 * Unified API response helpers.
 * All controllers should use these instead of writing res.json/status inline.
 */

/** 200 / 201 success */
export const ok = (res, data = null, message = "Success", statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

/** 201 Created shorthand */
export const created = (res, data = null, message = "Created") =>
  ok(res, data, message, 201);

/** Error response */
export const fail = (res, statusCode = 400, message = "Bad request") =>
  res.status(statusCode).json({ success: false, message });

/** Paginated list response */
export const paginated = (res, items, total, page, limit) =>
  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
