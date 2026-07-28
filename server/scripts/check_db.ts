import "dotenv/config";
import { db } from '../lib/db';
import { sql, eq } from 'drizzle-orm';
import { responses } from '../lib/schema';

async function main() {
  const sheetIdStr = "20006";
  const sheetIdNum = 20006;
  
  const beforeDelete = await db.select({ count: sql`count(*)` }).from(responses).where(eq(responses.answerSheetId, sheetIdNum));
  console.log('Before Delete:', beforeDelete);

  await db.transaction(async (tx) => {
    await tx.delete(responses).where(eq(responses.answerSheetId, sheetIdNum));
    const insideTx = await tx.select({ count: sql`count(*)` }).from(responses).where(eq(responses.answerSheetId, sheetIdNum));
    console.log('Inside TX after delete (num):', insideTx);
    tx.rollback();
  }).catch(() => {});
  
  await db.transaction(async (tx) => {
    await tx.delete(responses).where(eq(responses.answerSheetId, sheetIdStr as any));
    const insideTxStr = await tx.select({ count: sql`count(*)` }).from(responses).where(eq(responses.answerSheetId, sheetIdStr as any));
    console.log('Inside TX after delete (str):', insideTxStr);
    tx.rollback();
  }).catch(() => {});
  
  process.exit(0);
}

main();
