import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const departments = [
  { key: "head-company", name: "Head of Company", description: "Company-level strategic KPIs", sortOrder: 1 },
  { key: "head-business", name: "Head of Business", description: "Business operations KPIs", sortOrder: 2 },
  { key: "sales", name: "Sales", description: "Sales KPIs", sortOrder: 3 },
  { key: "finance", name: "Finance", description: "Finance & Recovery KPIs", sortOrder: 4 },
  { key: "laser", name: "Laser", description: "Laser cutting department KPIs", sortOrder: 5 },
  { key: "fabrication", name: "Fabrication", description: "Fabrication department KPIs", sortOrder: 6 },
  { key: "paint", name: "Paint & Sand", description: "Paint and sand blasting department KPIs", sortOrder: 7 },
  { key: "assembly", name: "Assembly", description: "Assembly and CED coating department KPIs", sortOrder: 8 },
  { key: "purchase", name: "Purchase", description: "Purchase and procurement KPIs", sortOrder: 9 },
  { key: "store", name: "Store", description: "Store and inventory management KPIs", sortOrder: 10 },
  { key: "quality", name: "Quality", description: "Quality control and assurance KPIs", sortOrder: 11 },
  { key: "development", name: "Development", description: "Product development and engineering KPIs", sortOrder: 12 },
  { key: "marketing", name: "Marketing", description: "Marketing and business development KPIs", sortOrder: 13 },
  { key: "hr", name: "HR", description: "Human Resources KPIs", sortOrder: 14 },
  { key: "maintenance", name: "Maintenance", description: "Machine and utility maintenance KPIs", sortOrder: 15 },
];

async function main() {
  console.log("Seeding KPI departments...");

  for (const dept of departments) {
    const row = await prisma.kpiDepartment.upsert({
      where: { key: dept.key },
      update: {
        name: dept.name,
        description: dept.description,
        sortOrder: dept.sortOrder,
        isActive: true,
      },
      create: dept,
    });
    console.log(`  ✓ ${row.name} (${row.key})`);
  }

  const total = await prisma.kpiDepartment.count();
  console.log(`\nDone. ${total} departments in database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
