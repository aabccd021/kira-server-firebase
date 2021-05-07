import assertNever from 'assert-never';
import { Change } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary } from 'lodash';

import { Field } from './schema';
import { Action } from './type';

export function fieldToActionOnUpdate(
  _collectionName: string,
  field: Field,
  _fieldName: string
): Dictionary<Action<Change<QueryDocumentSnapshot>>> | undefined {
  if (field.type === 'count') return undefined;
  if (field.type === 'creationTimestamp') return undefined;
  if (field.type === 'image') return undefined;
  if (field.type === 'owner') return undefined;
  // TODO: update reference
  if (field.type === 'reference') return undefined;
  if (field.type === 'string') return undefined;
  assertNever(field);
}
