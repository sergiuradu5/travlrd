import { restoreInvoiceStatusByLogId } from "@/app/lib/actions";
import { InvoiceLogsTable } from "@/app/lib/definitions";
import { formatDateToTimestamp } from "@/app/lib/utils";
import RestoreLogButton from "./restore-button";

export default function LogsTable({ logs }: { logs: InvoiceLogsTable[] }) {
  const handleRestore = async (logId: string, userId: string) => {
    try {
      await restoreInvoiceStatusByLogId(logId, userId);
    } catch (error) {}
  };

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Mobile View */}
          <div className="md:hidden">
            {logs?.map((log, index) => (
              <div key={log.id} className="mb-2 w-full rounded-md bg-white p-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="text-sm font-medium">{log.user_name}</p>
                    <p className="text-sm text-gray-500">{log.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">{log.type}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateToTimestamp(log.date)}
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-sm">
                    <span className="font-medium">From Status:</span>{" "}
                    <span className="capitalize">{log.from_status}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">To Status:</span>{" "}
                    <span className="capitalize">{log.to_status}</span>
                  </p>
                  {log.type === "change" && index === 0 && (
                    <div className="pt-4">
                      <RestoreLogButton logId={log.id} userId={log.user_id} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  User Name
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Email
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Action Type
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  From Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  To Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Restore
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {logs?.map((log, index) => (
                <tr
                  key={log.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <p>{log.user_name}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {log.user_email}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 capitalize">
                    {log.type}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToTimestamp(log.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 capitalize">
                    {log.from_status}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 capitalize">
                    {log.to_status}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {log.type === "change" && index === 0 && (
                      <RestoreLogButton logId={log.id} userId={log.user_id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
