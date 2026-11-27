/**
 * Audit Logging Service
 * Records sensitive administrative actions and configuration changes into MongoDB `audit_logs` collection.
 */

const { getAuditLogsCollection } = require("../config/db");

/**
 * Log an administrative or security action
 * @param {Object} params
 * @param {Object} params.actor { id, email, role, name }
 * @param {string} params.action Description or constant (e.g. "USER_ROLE_UPDATED", "USER_STATUS_TOGGLED")
 * @param {Object} params.target { type, id, name }
 * @param {Object} params.details Additional context, diffs, or reasons
 * @param {string} params.ip Client IP address
 */
async function recordAuditLog({ actor, action, target, details = {}, ip = null }) {
  try {
    const auditLogs = getAuditLogsCollection();
    const entry = {
      actor: {
        id: actor?.id || "unknown",
        email: actor?.email || "unknown",
        role: actor?.role || "unknown",
        name: actor?.name || "System",
      },
      action,
      target: {
        type: target?.type || "general",
        id: target?.id || null,
        name: target?.name || null,
      },
      details,
      ip,
      timestamp: new Date(),
    };

    const result = await auditLogs.insertOne(entry);
    return { success: true, logId: result.insertedId };
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve paginated audit logs for Super Admin dashboard
 */
async function getAuditLogs({ limit = 50, skip = 0, action = null, actorEmail = null } = {}) {
  try {
    const auditLogs = getAuditLogsCollection();
    const filter = {};
    if (action) filter.action = action;
    if (actorEmail) filter["actor.email"] = { $regex: actorEmail, $options: "i" };

    const total = await auditLogs.countDocuments(filter);
    const logs = await auditLogs
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray();

    return { success: true, logs, total };
  } catch (error) {
    console.error("Failed to query audit logs:", error);
    return { success: false, logs: [], total: 0, error: error.message };
  }
}

module.exports = {
  recordAuditLog,
  getAuditLogs,
};
