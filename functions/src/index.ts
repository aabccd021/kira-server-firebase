import { getApp } from './db';
import { getTriggers } from 'kira-server-firebase';

export const kira = getTriggers({
  firestore: getApp().firestore(),
  schema: {
    userCol: 'user',
    cols: {
      user: {
        displayName: {
          type: 'string',
        },
        memeImageCreatedCount: {
          type: 'count',
          countedCollection: 'memeImage',
          groupByReference: 'owner',
        },
        memeCreatedCount: {
          type: 'count',
          countedCollection: 'meme',
          groupByReference: 'owner',
        },
        profilePicture: {
          type: 'image',
        },
        joinedTime: {
          type: 'creationTime',
        },
      },
      memeImage: {
        creationTime: {
          type: 'creationTime',
        },
        image: {
          type: 'image',
        },
        memeCreatedCount: {
          type: 'count',
          countedCollection: 'meme',
          groupByReference: 'memeImage',
        },
        owner: {
          type: 'owner',
          syncFields: {
            profilePicture: true,
            displayName: true,
          },
        },
      },
      meme: {
        memeImage: {
          type: 'ref',
          referencedCollection: 'memeImage',
          syncFields: {
            image: true,
          },
        },
        creationTime: {
          type: 'creationTime',
        },
        text: {
          type: 'string',
        },
        owner: {
          type: 'owner',
          syncFields: {
            profilePicture: true,
            displayName: true,
          },
        },
      },
    },
  },
});
