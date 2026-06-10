-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "refundAuthorizedById" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refundAuthorizedById_fkey" FOREIGN KEY ("refundAuthorizedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
