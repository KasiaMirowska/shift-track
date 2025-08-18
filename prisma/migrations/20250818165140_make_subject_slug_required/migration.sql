/*
  Warnings:

  - Made the column `slug` on table `Subject` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Subject" ALTER COLUMN "slug" SET NOT NULL;
