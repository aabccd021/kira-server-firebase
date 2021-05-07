import assertNever from 'assert-never';
import { firestore } from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { isString } from 'lodash';

import { FieldToAction } from './types';

export const fieldToActionOnDelete: FieldToAction<QueryDocumentSnapshot> = ({
  field,
  fieldName,
  colName,
}) => {
  if (field.type === 'count') {
    const { countedCol, groupByRef } = field;
    return {
      [countedCol]: async ({ snapshot: document }) => {
        const data = document.data();
        const counterDocumentId = data[groupByRef]?.id;
        if (!isString(counterDocumentId)) {
          throw Error(
            `counterDocumentId is not string: ` +
              `${JSON.stringify(data)}[${groupByRef}]:${counterDocumentId}`
          );
        }
        return {
          [colName]: {
            [counterDocumentId]: {
              [fieldName]: firestore.FieldValue.increment(-1),
            },
          },
        };
      },
    };
  }
  if (field.type === 'owner') return undefined;
  if (field.type === 'creationTime') return undefined;
  if (field.type === 'image') return undefined;
  if (field.type === 'ref') return undefined;
  if (field.type === 'string') return undefined;
  assertNever(field);
};
