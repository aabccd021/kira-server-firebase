import { firestore } from 'firebase-admin';
import { region } from 'firebase-functions';
import { Actions, handleTrigger, InDocData, Schema } from 'kira-nosql';
import { isUndefined } from 'lodash';

import { FirebaseTriggerDict, FirestoreDocData, TriggerContext } from './types';

function firestoreToInDocData(data: FirestoreDocData): InDocData {
  return Object.fromEntries(
    Object.entries(data).map(([fieldName, field]) => {
      if (typeof field === 'string') {
        return [fieldName, { type: 'number', value: 0 }];
      }
    })
  );
}

export function getTriggers<S extends Schema>(
  actions: Actions,
  firestore: firestore.Firestore,
  schema: S
): FirebaseTriggerDict {
  const triggerContext: TriggerContext = {
    getDoc: async ({ col, id }) => {
      const docSnapshot = await firestore.collection(col).doc(id).get();
      const colDef = schema.cols[col];
      return { id, data: firestoreToInDocData(docSnapshot.data()) };
    },
  };
  return Object.fromEntries(
    Object.entries(schema.cols).map(([colName]) => {
      const document = region('asia-southeast2').firestore.document(`${colName}/{docId}`);

      const colOnCreateActions = actions.onCreate?.[colName];
      const colOnUpdateActions = actions.onUpdate?.[colName];
      const colOnDeleteActions = actions.onDelete?.[colName];
      return [
        colName,
        {
          onCreate: isUndefined(colOnCreateActions)
            ? undefined
            : document.onCreate((snapshot, eventContext) => handleTrigger),
          // onUpdate: isUndefined(colOnUpdateActions)
          //   ? undefined
          //   : document.onUpdate(handleTriggerWith(triggerContext, colOnUpdateActions)),
          // onDelete: isUndefined(colOnDeleteActions)
          //   ? undefined
          //   : document.onDelete(handleTriggerWith(triggerContext, colOnDeleteActions)),
        },
      ];
    })
  );
}
