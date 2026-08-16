import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@kecktech.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`Admin user with email ${email} already exists.`);
    return;
  }

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name: "Admin User",
      role: "admin",
    },
  });

  console.log(`Admin user created successfully:`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password} (please change this in production!)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

