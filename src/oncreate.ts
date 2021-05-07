import assertNever from 'assert-never';
import { firestore } from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary, isString, keys, pick } from 'lodash';

import { DocumentField, FieldToAction } from './types';

export const fieldToActionOnCreate: FieldToAction<QueryDocumentSnapshot> = ({
  colName,
  field,
  fieldName,
  userCol,
}) => {
  if (field.type === 'count') {
    const { countedCol, groupByRef } = field;
    return {
      [colName]: async ({ snapshot: document }) => ({
        [colName]: {
          [document.id]: {
            [fieldName]: 0,
          },
        },
      }),
      [countedCol]: async ({ snapshot: document }) => {
        const data = document.data();
        const counterDocumentId = data[groupByRef]?.['id'];
        if (!isString(counterDocumentId)) {
          throw Error(
            `counterDocumentId is not string: ` +
              `${JSON.stringify(data)}[${groupByRef}]:${counterDocumentId}`
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
  if (field.type === 'creationTime') {
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
  if (field.type === 'owner') {
    const { syncFields } = field;
    return {
      [colName]: async ({ keyToDocument, snapshot: document }) => {
        const data = document.data();
        const ownerId = data?.[fieldName]?.['id'];
        if (!isString(ownerId)) {
          throw Error(
            `owner is not string: ${JSON.stringify(data)}[${fieldName}]${data?.[fieldName]}`
          );
        }
        const docData = await keyToDocument({
          col: userCol,
          id: ownerId,
        }).then((snapshot) => snapshot.data());
        return {
          [colName]: {
            [document.id]: {
              [fieldName]: pick(docData, keys(syncFields)) as Dictionary<DocumentField>,
            },
          },
        };
      },
    };
  }
  if (field.type === 'ref') {
    const { syncFields, refCol } = field;
    return {
      [colName]: async ({ keyToDocument, snapshot: document }) => {
        const data = document.data();
        const refId = data?.[fieldName]?.['id'];
        if (!isString(refId)) {
          throw Error(
            `owner is not string: ${JSON.stringify(data)}[${fieldName}]${data?.[fieldName]}`
          );
        }
        const docData = await keyToDocument({
          col: refCol,
          id: refId,
        }).then((snapshot) => snapshot.data());
        return {
          [colName]: {
            [document.id]: {
              [fieldName]: pick(docData, keys(syncFields)) as Dictionary<DocumentField>,
            },
          },
        };
      },
    };
  }
  if (field.type === 'string') return undefined;
  assertNever(field);
};
