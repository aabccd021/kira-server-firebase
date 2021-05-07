import assertNever from 'assert-never';
import { Change } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';

import { FieldToAction } from './types';

export const fieldToActionOnUpdate: FieldToAction<Change<QueryDocumentSnapshot>> = ({ field }) => {
  if (field.type === 'count') return undefined;
  if (field.type === 'creationTime') return undefined;
  if (field.type === 'image') return undefined;
  if (field.type === 'owner') return undefined;
  // TODO: update reference
  if (field.type === 'ref') return undefined;
  if (field.type === 'string') return undefined;
  assertNever(field);
};
