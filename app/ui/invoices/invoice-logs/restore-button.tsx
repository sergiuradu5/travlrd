"use client"; // Mark as client component

import { restoreInvoiceStatusByLogId } from "@/app/lib/actions";
import { useState } from "react";

export default function RestoreLogButton({
  logId,
  userId,
}: {
  logId: string;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    try {
      setLoading(true);
      await restoreInvoiceStatusByLogId(logId, userId);
    } catch (error) {
      console.error("Failed to restore invoice status:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      onClick={handleRestore}
      disabled={loading}
    >
      {loading ? "Restoring..." : "Restore"}
    </button>
  );
}
