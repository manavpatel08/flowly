-- AlterTable
ALTER TABLE "Dish" ALTER COLUMN "costInPaise" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Portion" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DishAllergen" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "allergenId" TEXT NOT NULL,

    CONSTRAINT "DishAllergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishDietaryTag" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "dietaryTagId" TEXT NOT NULL,

    CONSTRAINT "DishDietaryTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DishAllergen_dishId_idx" ON "DishAllergen"("dishId");

-- CreateIndex
CREATE INDEX "DishAllergen_allergenId_idx" ON "DishAllergen"("allergenId");

-- CreateIndex
CREATE UNIQUE INDEX "DishAllergen_dishId_allergenId_key" ON "DishAllergen"("dishId", "allergenId");

-- CreateIndex
CREATE INDEX "DishDietaryTag_dishId_idx" ON "DishDietaryTag"("dishId");

-- CreateIndex
CREATE INDEX "DishDietaryTag_dietaryTagId_idx" ON "DishDietaryTag"("dietaryTagId");

-- CreateIndex
CREATE UNIQUE INDEX "DishDietaryTag_dishId_dietaryTagId_key" ON "DishDietaryTag"("dishId", "dietaryTagId");

-- AddForeignKey
ALTER TABLE "DishAllergen" ADD CONSTRAINT "DishAllergen_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishAllergen" ADD CONSTRAINT "DishAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishDietaryTag" ADD CONSTRAINT "DishDietaryTag_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishDietaryTag" ADD CONSTRAINT "DishDietaryTag_dietaryTagId_fkey" FOREIGN KEY ("dietaryTagId") REFERENCES "DietaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
