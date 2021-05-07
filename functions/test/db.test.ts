import { clearDb, getApp } from '../src/db';

const sleep = (milli: number) => new Promise((res) => setTimeout(res, milli));
const db = getApp().firestore();

describe('Test util test', () => {
  beforeEach(async () => {
    await clearDb();
  });

  test('add doc working', async function () {
    const postCount0 = (await db.collection('posts').get()).docs.length;
    expect(postCount0).toBe(0);
    expect(postCount0).not.toBe(1);

    await db.collection('posts').add({ title: 'New Post' });
    await sleep(1000);

    const postCount1 = (await db.collection('posts').get()).docs.length;
    expect(postCount1).toBe(1);
    expect(postCount1).not.toBe(0);

    await db.collection('posts').add({ title: 'New Post' });
    await sleep(1000);

    const postCount2 = (await db.collection('posts').get()).docs.length;
    expect(postCount2).toBe(2);
    expect(postCount2).not.toBe(1);
  });

  test('clearDb working', async function () {
    const db = getApp().firestore();

    const postCount = (await db.collection('posts').get()).docs.length;
    expect(postCount).toBe(0);
    expect(postCount).not.toBe(1);
    expect(postCount).not.toBe(2);
  });
});
