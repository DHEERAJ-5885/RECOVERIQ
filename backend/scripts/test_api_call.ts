import dotenv from 'dotenv';
dotenv.config();

async function testApi() {
  try {
    const res = await fetch('http://localhost:3001/api/recovery/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'e871204e-24b0-45d7-ada3-f4e5feed713d' }) // Using the first event from above
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
  } catch(e) {
    console.error(e);
  }
}
testApi();
