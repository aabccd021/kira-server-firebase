import assertNever from 'assert-never';
import { firestore } from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary, isString } from 'lodash';

import { Field } from './schema';
import { Action } from './type';

export function fieldToActionOnCreate(
  colName: string,
  field: Field,
  fieldName: string
): Dictionary<Action<QueryDocumentSnapshot>> | undefined {
  if (field.type === 'count') {
    const { countedCollection, groupByReference } = field;
    return {
      [colName]: async ({ snapshot: document }) => ({
        [colName]: {
          [document.id]: {
            [fieldName]: 1,
          },
        },
      }),
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
          [colName]: {
            [counterDocumentId]: {
              [fieldName]: firestore.FieldValue.increment(1),
            },
          },
        };
      },
    };
  }
  if (field.type === 'creationTimestamp') {
    return {
      [colName]: async ({ snapshot: document }) => ({
        [colName]: {
          [document.id]: {
            [fieldName]: firestore.FieldValue.serverTimestamp(),
          },
        },
      }),
    };
  }
  if (field.type === 'image') return undefined;
  // TODO: sync fields
  if (field.type === 'owner') return undefined;
  if (field.type === 'reference') return undefined;
  if (field.type === 'string') return undefined;
  assertNever(field);
}
