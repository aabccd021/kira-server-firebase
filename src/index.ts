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
              map(col, (doc, id) => writeDocument({ col: colName, id }, doc))
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

function mapColFieldToAction<T extends Snapshot>(
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
          (prev, action, colName) => ({
            ...prev,
            [colName]: [...(prev[colName] ?? []), action],
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
  const onCreateActions = mapColFieldToAction(schema, fieldToActionOnCreate);
  const onUpdateActions = mapColFieldToAction(schema, fieldToActionOnUpdate);
  const onDeleteActions = mapColFieldToAction(schema, fieldToActionOnDelete);
  return mapValues(schema.cols, (_, colName) => {
    // TODO: add region
    const document = functions
      .region('asia-southeast2')
      .firestore.document(`${colName}/{documentId}`);
    const triggerContext: TriggerContext = {
      keyToDocument: ({ col, id }) => firestore.collection(col).doc(id).get(),
      writeDocument: ({ col, id }, document) =>
        firestore.collection(col).doc(id).set(document, { merge: true }),
      dbrQuery: (query) => {
        const col = firestore.collection(query.col);
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
