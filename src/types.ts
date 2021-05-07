import { firestore } from 'firebase-admin';
import { Change, EventContext } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Dictionary } from 'lodash';

import { Field } from './schema';

export type DocumentKey = { col: string; id: string };

export type TriggerContext = {
  keyToDocument: KeyToDocument;
  writeDocument: (key: DocumentKey, document: Document) => Promise<firestore.WriteResult>;
  dbrQuery: DBRQuery;
};

export type KeyToDocument = (
  key: DocumentKey
) => Promise<firestore.DocumentSnapshot<firestore.DocumentData>>;

export type Update = Dictionary<Dictionary<Document>>;

export type DocumentField =
  | number
  | string
  | FirebaseFirestore.FieldValue
  | Dictionary<DocumentField>;
export type Document = Dictionary<DocumentField>;

export type Snapshot = QueryDocumentSnapshot | Change<QueryDocumentSnapshot>;

export type Action<T extends Snapshot> = (params: {
  keyToDocument: KeyToDocument;
  snapshot: T;
  eventContext: EventContext;
  dbrQuery: DBRQuery;
}) => Promise<Update>;

export type FieldToAction<T extends Snapshot> = (args: {
  userCol: string;
  colName: string;
  field: Field;
  fieldName: string;
}) => Dictionary<Action<T>> | undefined;

export type Query<T extends string = string> = {
  col: T;
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
};

export type DBRQuery = (query: Query) => Promise<{ id: string }[]>;
