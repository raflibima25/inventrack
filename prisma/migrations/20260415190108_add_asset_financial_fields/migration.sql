-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "acquisition_value" DECIMAL(15,2),
ADD COLUMN     "depreciation" DECIMAL(15,2),
ADD COLUMN     "item_code" VARCHAR(50),
ADD COLUMN     "nup" VARCHAR(50);
