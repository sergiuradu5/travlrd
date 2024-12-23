import {
  fetchCustomers,
  fetchInvoiceById,
  fetchInvoiceLogsByInvoiceId,
} from "@/app/lib/data";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import Form from "@/app/ui/invoices/edit-form";
import LogsTable from "@/app/ui/invoices/invoice-logs/table";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Invoice",
};

export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const [invoice, customers, logs] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
    fetchInvoiceLogsByInvoiceId(id),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          {
            label: "Edit Invoice",
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
      <LogsTable logs={logs} />
    </main>
  );
}
