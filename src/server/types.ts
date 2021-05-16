import { firestore } from 'firebase-admin';
import { Change } from 'firebase-functions';
import * as functions from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { Schema } from 'kira-nosql';
import { GetDoc } from 'kira-nosql/lib/type';
import { Dictionary } from 'lodash';

export type DocumentKey = { readonly col: string; readonly id: string };

export type TriggerContext = {
  readonly getDoc: GetDoc;
};

export type Update = Dictionary<Dictionary<Document>>;

export type DocumentField =
  | number
  | string
  | FirebaseFirestore.FieldValue
  | Dictionary<DocumentField>;
export type Document = Dictionary<DocumentField>;

export type Snapshot = QueryDocumentSnapshot | Change<QueryDocumentSnapshot>;

export type Query<T extends string = string> = {
  readonly col: T;
  readonly limit?: number;
  readonly orderByField?: string;
  readonly orderDirection?: 'asc' | 'desc';
};

export type DBRQuery = (query: Query) => Promise<readonly { readonly id: string }[]>;

export type FirebaseTriggerDict = Dictionary<{
  readonly onCreate?: functions.CloudFunction<QueryDocumentSnapshot>;
  readonly onUpdate?: functions.CloudFunction<functions.Change<QueryDocumentSnapshot>>;
  readonly onDelete?: functions.CloudFunction<QueryDocumentSnapshot>;
}>;

export type GetTriggers<S extends Schema> = (args: {
  readonly firestore: firestore.Firestore;
  readonly schema: S;
}) => FirebaseTriggerDict;

export type FirestorePrimitiveField = number | string | firestore.Timestamp;

export type FirestoreDocData = {
  readonly [key: string]: FirestoreDocData | FirestorePrimitiveField;
};
