import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { handleDebateMessage } from './controllers/debateController';

dotenv.config();

const prisma = new PrismaClient();

const USER_ID = '22222222-2222-2222-2222-222222222222';
const SESSION_ID = '11111111-1111-1111-1111-111111111111';

async function runTest() {
  console.log('Ensuring test user exists (satisfy FK constraint)...');
  const user = await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, phoneNumber: '+84900000000', displayName: 'Test User' },
  });
  console.log('Test user ready:', user.id);

  console.log('Testing handleDebateMessage endpoint...');

  const mockReq: any = {
    params: { sessionId: SESSION_ID },
    body: {
      userId: USER_ID,
      topic: 'Học sinh dưới 15 tuổi không nên sử dụng mạng xã hội',
      content: 'Tôi cho rằng mạng xã hội gây mất tập trung và ảnh hưởng tiêu cực đến tâm lý lứa tuổi học sinh.',
      stance: 'AFFIRMATIVE',
    },
  };

  const mockRes: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      console.log('Response Status:', this.statusCode);
      console.log('Response Data:', JSON.stringify(data, null, 2));
      return this;
    },
  };

  await handleDebateMessage(mockReq, mockRes);
}

runTest()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
