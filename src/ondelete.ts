import assertNever from 'assert-never';
import { firestore } from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary, isString } from 'lodash';

import { Field } from './schema';
import { Action } from './type';

export function fieldToActionOnDelete(
  collectionName: string,
  field: Field,
  fieldName: string
): Dictionary<Action<QueryDocumentSnapshot>> | undefined {
  if (field.type === 'count') {
    const { countedCollection, groupByReference } = field;
    return {
      [countedCollection]: async ({ snapshot: document }) => {
        const data = document.data();
        const counterDocumentId = data[groupByReference]?.id;
        if (!isString(counterDocumentId)) {
          throw Error(
            `counterDocumentId is not string: ` +
              `${JSON.stringify(data)}[${groupByReference}]:${counterDocumentId}`
          );
        }
        return {
          [collectionName]: {
            [counterDocumentId]: {
              [fieldName]: firestore.FieldValue.increment(-1),
            },
          },
        };
      },
    };
  }
  if (field.type === 'owner') return undefined;
  if (field.type === 'creationTimestamp') return undefined;
  if (field.type === 'image') return undefined;
  if (field.type === 'reference') return undefined;
  if (field.type === 'string') return undefined;
  assertNever(field);
}
