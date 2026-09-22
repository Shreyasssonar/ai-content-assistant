const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.entry.create({
    data: {
      originalText: "Artificial intelligence is fundamentally reshaping modern software development by enhancing developer productivity, automating repetitive coding tasks, and accelerating debugging processes. Intelligent code completion engines and AI-assisted tools enable developers to design robust architectures, catch potential bugs early, and write clean, maintainable code faster than ever before.",
      summary: "AI is enhancing developer productivity and automating coding tasks to accelerate software development.",
      tags: JSON.stringify(["AI", "Development", "Productivity"])
    }
  });

  await prisma.entry.create({
    data: {
      originalText: "The integration of renewable energy sources, such as solar and wind, into the power grid presents unique challenges for maintaining grid stability. Advanced energy storage systems and smart grid technologies are essential for balancing supply and demand.",
      summary: "Smart grid technologies and energy storage are crucial for integrating renewable energy and maintaining grid stability.",
      tags: JSON.stringify(["Renewable Energy", "Smart Grid", "Sustainability"])
    }
  });

  console.log("Dummy data created!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
