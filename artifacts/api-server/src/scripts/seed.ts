import { seedTemplates } from "../lib/templates/seed-templates";

async function main() {
  await seedTemplates();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
