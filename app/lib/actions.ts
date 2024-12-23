'use server';

import { signIn } from '@/auth';
import { sql } from '@vercel/postgres';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { InvoiceLogsTable, InvoicesTable, invoiceStatuses, InvoiceStatusType } from './definitions';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(invoiceStatuses, {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });
const UpdateInvoiceStatus = FormSchema.pick({ status: true, id: true }).extend({
  userId: z.string(),
});
const RestoreInvoiceStatus = z.object({
  logId: z.string(),
  userId: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  userId: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`BEGIN;`;

    const existingInvoice = await sql<InvoicesTable>`
      SELECT status FROM invoices WHERE id = ${id};
    `;

    const oldStatus = existingInvoice.rows[0].status;

    if (oldStatus === status) {
      throw new Error('Invoice status cannot be the same.');
    }

    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO invoice_logs (invoice_id, user_id, from_status, to_status, type)
      VALUES (${id}, ${userId}, ${oldStatus}, ${status}, 'change');
    `
    await sql`COMMIT;`;
  } catch (error: any) {
    await sql`ROLLBACK;`;
    return { message: `Database Error: Failed to Update Invoice: ${error.message!}` };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function updateInvoiceStatus(
  id: string,
  newStatus: InvoiceStatusType,
  userId: string,
) {
  const validatedFields = UpdateInvoiceStatus.safeParse({
    status: newStatus,
    id,
    userId,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice Status.',
    };
  }

  const { id: validatedId, status: validatedStatus } = validatedFields.data;
  try {
    await sql`BEGIN;`;
    const existingInvoice = await sql<InvoicesTable>`
      SELECT status FROM invoices WHERE id = ${validatedId};
    `;

    const oldStatus = existingInvoice.rows[0].status;
    await sql`
      UPDATE invoices
      SET status = ${validatedStatus}
      WHERE id = ${validatedId}
    `;
    await sql`
    INSERT INTO invoice_logs(invoice_id, user_id, from_status, to_status, type)
    VALUES (${validatedId}, ${userId}, ${oldStatus}, ${validatedStatus}, 'change');
    `
    await sql`COMMIT;`;
  } catch (error) {
    console.error("Database Error: ", error);
    await sql`ROLLBACK;`;
    return { message: 'Database Error: Failed to Update Invoice Status.' };
  }

  revalidatePath('/dashboard/invoices');
}

export async function restoreInvoiceStatusByLogId(
  logId: string,
  userId: string,
) {
  const validatedFields = RestoreInvoiceStatus.safeParse({
    logId,
    userId,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Restore Invoice Status.',
    };
  }

  const { logId: validatedLogId, userId: validatedUserId } = validatedFields.data;
  try {
    await sql`BEGIN;`;
    const existingLog = await sql<InvoiceLogsTable>`
      SELECT from_status, to_status, invoice_id FROM invoice_logs WHERE id = ${validatedLogId};
    `;

    const invoiceId = existingLog.rows[0].invoice_id;
    const newStatus = existingLog.rows[0].from_status;
    const oldStatus = existingLog.rows[0].to_status;
    await sql`
      UPDATE invoices
      SET status = ${newStatus}
      WHERE id = ${invoiceId}
    `;
    await sql`
    INSERT INTO invoice_logs(invoice_id, user_id, from_status, to_status, type)
    VALUES (${invoiceId}, ${userId}, ${oldStatus}, ${newStatus}, 'restore');
    `
    await sql`COMMIT;`;
  } catch (error) {
    await sql`ROLLBACK;`;
    console.error("Database Error: ", error);
    return { message: 'Database Error: Failed to Restore Invoice Status.' };
  }

  revalidatePath('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
