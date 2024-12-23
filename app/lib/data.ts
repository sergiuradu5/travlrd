import { QueryResult, sql } from '@vercel/postgres';
import { DAYS_UNTIL_INVOICE_DUE } from './constants';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoiceLogsTable,
  InvoicesTable,
  InvoiceTabStatusType,
  LatestInvoiceRaw,
  Revenue
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue>`SELECT * FROM revenue`;

    // console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
  status?: InvoiceTabStatusType
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    let invoices: QueryResult<InvoicesTable> | undefined = undefined;
    if (!status) {
      invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    } else {
      switch (status) {
        case 'all': {
          invoices = await sql`SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          ( customers.name ILIKE ${`%${query}%`} OR
          customers.email ILIKE ${`%${query}%`} OR
          invoices.amount::text ILIKE ${`%${query}%`} OR
          invoices.date::text ILIKE ${`%${query}%`} ) 
        ORDER BY invoices.date DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`
          break;
        }

        case 'overdue': {
          const searchParam = `%${query}%`;
          invoices = await sql.query(`SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          ( customers.name ILIKE $1 OR
          customers.email ILIKE $1 OR
          invoices.amount::text ILIKE $1 OR
          invoices.date::text ILIKE $1 ) 

         AND invoices.date::TIMESTAMP < (NOW() - INTERVAL '${DAYS_UNTIL_INVOICE_DUE} days') AND invoices.status = 'pending'
          ORDER BY invoices.date DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`, [searchParam]);
          break;
        }

        case 'pending': {
          const searchParam = `%${query}%`;
          invoices = await sql.query(`SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          ( customers.name ILIKE $1 OR
          customers.email ILIKE $1 OR
          invoices.amount::text ILIKE $1 OR
          invoices.date::text ILIKE $1 ) 

         AND invoices.date::TIMESTAMP >= (NOW() - INTERVAL '${DAYS_UNTIL_INVOICE_DUE} days') AND invoices.status = 'pending'
          ORDER BY invoices.date DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`, [searchParam]);
          break;
        }

        default: {
          invoices = await sql`SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          ( customers.name ILIKE ${`%${query}%`} OR
          customers.email ILIKE ${`%${query}%`} OR
          invoices.amount::text ILIKE ${`%${query}%`} OR
          invoices.date::text ILIKE ${`%${query}%`} ) 

           AND invoices.status = ${status}
        ORDER BY invoices.date DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`;
          break;
        }
      }
    }

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string, status?: InvoiceTabStatusType) {
  try {
    let count: QueryResult<{ count: string }> | undefined = undefined;
    if (!status) {
      count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;
    } else {
      switch (status) {
        case 'all': {
          count = await sql`SELECT COUNT(*)
          FROM invoices
          JOIN customers ON invoices.customer_id = customers.id
          WHERE
           ( customers.name ILIKE ${`%${query}%`} OR
            customers.email ILIKE ${`%${query}%`} OR
            invoices.amount::text ILIKE ${`%${query}%`} OR
            invoices.date::text ILIKE ${`%${query}%`} ) `;
          break;
        }

        case 'overdue': {
          const searchParam = `%${query}%`; // Define once and reuse
          count = await sql.query(`
            SELECT COUNT(*)
            FROM invoices
            JOIN customers ON invoices.customer_id = customers.id
            WHERE
              (
                customers.name ILIKE $1 OR
                customers.email ILIKE $1 OR
                invoices.amount::text ILIKE $1 OR
                invoices.date::text ILIKE $1
              )
              AND invoices.date::date < NOW()::DATE - INTERVAL '${DAYS_UNTIL_INVOICE_DUE} days' 
              AND invoices.status = 'pending'
          `, [searchParam]);

          break;
        }

        case 'pending': {
          const searchParam = `%${query}%`; // Define once and reuse

          count = await sql.query(`
            SELECT COUNT(*)
            FROM invoices
            JOIN customers ON invoices.customer_id = customers.id
            WHERE
              (
                customers.name ILIKE $1 OR
                customers.email ILIKE $1 OR
                invoices.amount::text ILIKE $1 OR
                invoices.date::text ILIKE $1
              )
              AND invoices.date::date >= NOW()::DATE - INTERVAL '${DAYS_UNTIL_INVOICE_DUE} days'
              AND invoices.status = 'pending'
          `, [searchParam]);

          break;
        }

        default: {
          count = await sql`SELECT COUNT(*)
          FROM invoices
          JOIN customers ON invoices.customer_id = customers.id
          WHERE
           ( customers.name ILIKE ${`%${query}%`} OR
            customers.email ILIKE ${`%${query}%`} OR
            invoices.amount::text ILIKE ${`%${query}%`} OR
            invoices.date::text ILIKE ${`%${query}%`} ) AND invoices.status = ${status}`;
          break;
        }

      }
    }

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}


export async function fetchInvoiceLogsByInvoiceId(invoiceId: string) {
  try {
    const invoice_logs = await sql<InvoiceLogsTable>`
      SELECT
        invoice_logs.id,
        invoice_logs.invoice_id,
        invoice_logs.date,
        invoice_logs.type,
        invoice_logs.from_status,
        invoice_logs.to_status,
        users.name as user_name,
        users.email as user_email,
        users.id as user_id
      FROM invoice_logs
      LEFT JOIN users ON invoice_logs.user_id = users.id
      WHERE invoice_logs.invoice_id = ${invoiceId}
      ORDER BY invoice_logs.date DESC;
    `;

    return invoice_logs.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice logs.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
