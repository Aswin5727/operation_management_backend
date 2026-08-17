import prisma from './src/config/prisma.js';

async function deleteUser() {
  const email = 'tamil.tamilselvan4002@gmail.com';
  console.log(`Looking for email: ${email}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      console.log(`Found User: ${user.id}. Deleting related tokens and user...`);
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.loginEvent.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log('User deleted successfully.');
    } else {
      console.log('User not found in the User table.');
    }

    const branchFaculties = await prisma.branchFaculty.findMany({
      where: { email }
    });

    if (branchFaculties.length > 0) {
      console.log(`Found ${branchFaculties.length} BranchFaculty records. Deleting...`);
      await prisma.branchFaculty.deleteMany({ where: { email } });
      console.log('BranchFaculty records deleted.');
    } else {
      console.log('No BranchFaculty records found.');
    }

  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
