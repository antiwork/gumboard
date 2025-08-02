const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTestUsers() {
  try {
    // Delete test email (change this to your test email)
    const testEmail = 'sahasaheli04@gmail.com';
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (user) {
      // Delete user and all related data (cascade delete)
      await prisma.user.delete({
        where: { email: testEmail }
      });
      console.log(`✅ Deleted user: ${testEmail}`);
    } else {
      console.log(`ℹ️  No user found with email: ${testEmail}`);
    }
    
    console.log('✅ Test user cleared successfully');
  } catch (error) {
    console.error('Error clearing test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestUsers();