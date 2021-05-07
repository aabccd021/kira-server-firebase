import { firestore } from 'firebase-admin';
import { Change, EventContext } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary } from 'lodash';

import { Field } from './schema';

export type DocumentKey = { collection: string; id: string };

export type TriggerContext = {
  keyToDocument: KeyToDocument;
  writeDocument: (key: DocumentKey, document: Document) => Promise<firestore.WriteResult>;
};

export type KeyToDocument = (
  key: DocumentKey
) => Promise<firestore.DocumentSnapshot<firestore.DocumentData>>;

export type Update = Dictionary<Dictionary<Document>>;

export type Document = Dictionary<number | string | FirebaseFirestore.FieldValue>;

export type Snapshot = QueryDocumentSnapshot | Change<QueryDocumentSnapshot>;

export type Action<T extends Snapshot> = (params: {
  keyToDocument: KeyToDocument;
  snapshot: T;
  eventContext: EventContext;
}) => Promise<Update>;

export type FieldToAction<T extends Snapshot> = (
  collectionName: string,
  field: Field,
  fieldName: string
) => Dictionary<Action<T>> | undefined;
