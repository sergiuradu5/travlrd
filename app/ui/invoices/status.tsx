"use client"; // Required because we are using useState and event handlers

import { updateInvoiceStatus } from "@/app/lib/actions";
import { DAYS_UNTIL_INVOICE_DUE } from "@/app/lib/constants";
import { invoiceStatuses, InvoiceStatusType } from "@/app/lib/definitions";
import {
  CheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function InvoiceStatus({
  status,
  date,
  invoiceId,
}: {
  status: InvoiceStatusType;
  date: string;
  invoiceId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatusType>(status);
  const { data: session } = useSession();

  const invoiceDate = new Date(date);
  const twoWeeksAgo = new Date(
    Date.now() - DAYS_UNTIL_INVOICE_DUE * 24 * 60 * 60 * 1000
  );
  const displayStatus: InvoiceStatusType | "overdue" =
    currentStatus === "pending" && invoiceDate < twoWeeksAgo
      ? "overdue"
      : currentStatus;

  const handleUpdateStatus = async (newStatus: InvoiceStatusType) => {
    setIsOpen(false);
    if (newStatus !== currentStatus) {
      await updateInvoiceStatus(invoiceId, newStatus, session?.user?.id!);
      setCurrentStatus(newStatus);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Status Chip */}
      <span
        className={clsx(
          "inline-flex items-center rounded-full px-2 py-1 text-xs cursor-pointer",
          {
            "bg-red-400 text-white": displayStatus === "overdue",
            "bg-gray-100 text-gray-500": displayStatus === "pending",
            "bg-green-500 text-white": displayStatus === "paid",
            "bg-violet-500 text-white": displayStatus === "canceled",
          }
        )}
        onClick={() => setIsOpen((prev) => !prev)} // Toggle dropdown
      >
        {displayStatus === "pending" ? (
          <>
            Pending
            <ClockIcon className="ml-1 w-4 text-gray-500" />
          </>
        ) : null}
        {displayStatus === "paid" ? (
          <>
            Paid
            <CheckIcon className="ml-1 w-4 text-white" />
          </>
        ) : null}
        {displayStatus === "overdue" ? (
          <>
            Overdue
            <ExclamationCircleIcon className="ml-1 w-4 text-white" />
          </>
        ) : null}
        {displayStatus === "canceled" ? (
          <>
            Canceled
            <XCircleIcon className="ml-1 w-4 text-white" />
          </>
        ) : null}
        <svg
          className="ml-1 w-4 h-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.23 8.25a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-40 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <ul className="py-1">
            {invoiceStatuses
              .filter((status) => status !== currentStatus) // Exclude current status
              .map((statusOption) => (
                <li
                  key={statusOption}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleUpdateStatus(statusOption)}
                >
                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
