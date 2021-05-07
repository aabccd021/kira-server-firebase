import { getApp } from './db';
import { getTriggers } from 'kira-server-firebase';

export const kira = getTriggers({
  firestore: getApp().firestore(),
  collections: {
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
        type: 'creationTimestamp',
      },
    },
    memeImage: {
      creationTime: {
        type: 'creationTimestamp',
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
        type: 'reference',
        referencedCollection: 'memeImage',
        syncFields: {
          image: true,
        },
      },
      creationTime: {
        type: 'creationTimestamp',
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
});
