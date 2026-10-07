const prisma = require("./prisma");

const hubungkanDB = async () => {
  await prisma.$connect();
  console.log("MySQL (Prisma) terhubung");
};

module.exports = hubungkanDB;
