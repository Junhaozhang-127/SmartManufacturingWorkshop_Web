const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ok = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
  const portalContent = await prisma.$queryRawUnsafe('SHOW TABLES LIKE "portal_content"');
  const portalCarousel = await prisma.$queryRawUnsafe('SHOW TABLES LIKE "portal_carousel_item"');
  console.log({ ok, portalContent, portalCarousel });
}

main()
  .catch((e) => {
    console.error(String(e && e.message ? e.message : e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
