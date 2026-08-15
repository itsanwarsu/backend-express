const bcrypt = require("bcryptjs");
const prisma = require("./config/prisma");

async function main() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully!");

    const password = await bcrypt.hash("password123", 10);

    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: "test@example.com",
        password,
        provider: "local",
        role: "user",
      },
    });

    console.log("User created:");
    console.log(user);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
