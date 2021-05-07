import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import {
  chain,
  Dictionary,
  forEach,
  isUndefined,
  map,
  mapValues,
  memoize,
  merge,
  noop,
  reduce,
} from 'lodash';

import { fieldToActionOnCreate } from './oncreate';
import { fieldToActionOnDelete } from './ondelete';
import { fieldToActionOnUpdate } from './onupdate';
import { Schema } from './schema';
import { Action, FieldToAction, Snapshot, TriggerContext } from './types';

function handleTriggerWith<T extends Snapshot>(
  triggerContext: TriggerContext,
  actions: Action<T>[]
) {
  return (snapshot: T, eventContext: functions.EventContext) =>
    handleTrigger({ snapshot, eventContext, triggerContext, actions });
}
async function handleTrigger<T extends Snapshot>({
  snapshot,
  actions,
  eventContext,
  triggerContext: { keyToDocument, writeDocument, dbrQuery },
}: {
  actions: Action<T>[];
  snapshot: T;
  eventContext: functions.EventContext;
  triggerContext: TriggerContext;
}): Promise<void> {
  const memoizedKeyToDocument = memoize(keyToDocument);
  return (
    // execute actions
    Promise.all(
      map(actions, (action) =>
        action({
          keyToDocument: memoizedKeyToDocument,
          snapshot,
          eventContext,
          dbrQuery,
        })
      )
    )
      // write document updates
      .then((updates) =>
        Promise.allSettled(
          chain(updates)
            .reduce(merge)
            .flatMap((col, colName) =>
              map(col, (doc, id) => writeDocument({ collection: colName, id }, doc))
            )
            .value()
        )
      )
      // log results
      .then((results) => {
        forEach(results, (result) =>
          result.status === 'rejected'
            ? functions.logger.warn('Kira warning', { snapshot, eventContext, result })
            : noop
        );
      })
  );
}

function mapCollectionFieldsToActions<T extends Snapshot>(
  schema: Schema,
  fieldToAction: FieldToAction<T>
): Dictionary<Action<T>[]> {
  return chain(schema.cols)
    .flatMap((fieldDict, colName) =>
      map(fieldDict, (field, fieldName) =>
        fieldToAction({ userCol: schema.userCol, colName, field, fieldName })
      )
    )
    .compact()
    .reduce<Dictionary<Action<T>[]>>(
      (prev, actionDict) =>
        reduce(
          actionDict,
          (prev, action, collectionName) => ({
            ...prev,
            [collectionName]: [...(prev[collectionName] ?? []), action],
          }),
          prev
        ),
      {}
    )
    .value();
}

export function getTriggers({
  firestore,
  schema,
}: {
  firestore: admin.firestore.Firestore;
  schema: Schema;
}): Dictionary<{
  onCreate?: functions.CloudFunction<QueryDocumentSnapshot>;
  onUpdate?: functions.CloudFunction<functions.Change<QueryDocumentSnapshot>>;
  onDelete?: functions.CloudFunction<QueryDocumentSnapshot>;
}> {
  const onCreateActions = mapCollectionFieldsToActions(schema, fieldToActionOnCreate);
  const onUpdateActions = mapCollectionFieldsToActions(schema, fieldToActionOnUpdate);
  const onDeleteActions = mapCollectionFieldsToActions(schema, fieldToActionOnDelete);
  return mapValues(schema.cols, (_, colName) => {
    // TODO: add region
    const document = functions
      .region('asia-southeast2')
      .firestore.document(`${colName}/{documentId}`);
    const triggerContext: TriggerContext = {
      keyToDocument: ({ collection, id }) => firestore.collection(collection).doc(id).get(),
      writeDocument: ({ collection, id }, document) =>
        firestore.collection(collection).doc(id).set(document, { merge: true }),
      dbrQuery: (query) => {
        const col = firestore.collection(query.collection);
        const orderedQuery = query.orderByField
          ? col.orderBy(query.orderByField, query.orderDirection)
          : col;
        const limitedQuery = query.limit ? orderedQuery.limit(query.limit) : orderedQuery;
        return limitedQuery.get().then((snapshot) => map(snapshot.docs, ({ id }) => ({ id })));
      },
    };
    const colOnCreateActions = onCreateActions?.[colName];
    const colOnUpdateActions = onUpdateActions?.[colName];
    const colOnDeleteActions = onDeleteActions?.[colName];
    return {
      onCreate: isUndefined(colOnCreateActions)
        ? undefined
        : document.onCreate(handleTriggerWith(triggerContext, colOnCreateActions)),
      onUpdate: isUndefined(colOnUpdateActions)
        ? undefined
        : document.onUpdate(handleTriggerWith(triggerContext, colOnUpdateActions)),
      onDelete: isUndefined(colOnDeleteActions)
        ? undefined
        : document.onDelete(handleTriggerWith(triggerContext, colOnDeleteActions)),
    };
  });
}
