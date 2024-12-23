import {
  invoiceTabStatuses,
  InvoiceTabStatusType,
} from "@/app/lib/definitions";
import clsx from "clsx";
import Link from "next/link";

export default function InvoiceStatusTabs({
  currentStatus,
}: {
  currentStatus: InvoiceTabStatusType;
}) {
  return (
    <div className="flex space-x-4 border-b border-gray-200 pb-2">
      {invoiceTabStatuses.map((status) => (
        <Link
          key={status}
          href={
            `?status=${status}` // Set "status" param
          }
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-t-md",
            currentStatus === status
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Link>
      ))}
    </div>
  );
}
