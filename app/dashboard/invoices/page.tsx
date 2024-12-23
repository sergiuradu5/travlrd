import { fetchInvoicesPages } from "@/app/lib/data";
import {
  invoiceTabStatuses,
  InvoiceTabStatusType,
} from "@/app/lib/definitions";
import { lusitana } from "@/app/ui/fonts";
import { CreateInvoice } from "@/app/ui/invoices/buttons";
import Pagination from "@/app/ui/invoices/pagination";
import Table from "@/app/ui/invoices/table";
import InvoiceStatusTabs from "@/app/ui/invoices/tabs";
import Search from "@/app/ui/search";
import { InvoicesTableSkeleton } from "@/app/ui/skeletons";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    status?: string;
  };
}) {
  const query = searchParams?.query || "";
  const currentPage = Number(searchParams?.page) || 1;

  const validatedStatus =
    searchParams?.status &&
    invoiceTabStatuses.includes(searchParams?.status as InvoiceTabStatusType)
      ? (searchParams.status as InvoiceTabStatusType)
      : "all";

  const totalPages = await fetchInvoicesPages(query, validatedStatus);
  
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Invoices</h1>
      </div>
      <div>
        <InvoiceStatusTabs currentStatus={validatedStatus} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search invoices..." />
        <CreateInvoice />
      </div>
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <Table
          query={query}
          currentPage={currentPage}
          invoiceTabStatus={validatedStatus}
        />
      </Suspense>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
