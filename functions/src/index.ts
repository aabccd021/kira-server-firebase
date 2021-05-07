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
          countedCol: 'memeImage',
          groupByRef: 'owner',
        },
        memeCreatedCount: {
          type: 'count',
          countedCol: 'meme',
          groupByRef: 'owner',
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
          countedCol: 'meme',
          groupByRef: 'memeImage',
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
          refCol: 'memeImage',
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
