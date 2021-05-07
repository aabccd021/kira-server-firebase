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
import { Field } from './schema';
import { Action, FieldToAction, Snapshot, TriggerContext } from './type';

function handleTriggerWith<T extends Snapshot>(
  triggerContext: TriggerContext,
  actions: Action<T>[]
) {
  return (snapshot: T, eventContext: functions.EventContext) =>
    handleTrigger({ snapshot, eventContext, triggerContext, actions });
}
async function handleTrigger<T extends Snapshot>(context: {
  actions: Action<T>[];
  triggerContext: TriggerContext;
  snapshot: T;
  eventContext: functions.EventContext;
}): Promise<void> {
  const {
    eventContext,
    snapshot,
    actions,
    triggerContext: { keyToDocument, writeDocument },
  } = context;
  const memoizedKeyToDocument = memoize(keyToDocument);
  return (
    // execute actions
    Promise.all(
      map(actions, (action) =>
        action({
          keyToDocument: memoizedKeyToDocument,
          snapshot,
          eventContext,
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
  collections: Dictionary<Dictionary<Field>>,
  fieldToAction: FieldToAction<T>
): Dictionary<Action<T>[]> {
  return chain(collections)
    .flatMap((fieldDict, collectionName) =>
      map(fieldDict, (field, fieldName) => fieldToAction(collectionName, field, fieldName))
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

export function getTriggers(args: {
  firestore: admin.firestore.Firestore;
  collections: Dictionary<Dictionary<Field>>;
}): Dictionary<{
  onCreate?: functions.CloudFunction<QueryDocumentSnapshot>;
  onUpdate?: functions.CloudFunction<functions.Change<QueryDocumentSnapshot>>;
  onDelete?: functions.CloudFunction<QueryDocumentSnapshot>;
}> {
  const { firestore, collections } = args;
  const onCreateActions = mapCollectionFieldsToActions(collections, fieldToActionOnCreate);
  const onUpdateActions = mapCollectionFieldsToActions(collections, fieldToActionOnUpdate);
  const onDeleteActions = mapCollectionFieldsToActions(collections, fieldToActionOnDelete);
  return mapValues(collections, (_, colName) => {
    // TODO: add region
    const document = functions
      .region('asia-southeast2')
      .firestore.document(`${colName}/{documentId}`);
    const triggerContext: TriggerContext = {
      keyToDocument: ({ collection, id }) => firestore.collection(collection).doc(id).get(),
      writeDocument: ({ collection, id }, document) =>
        firestore.collection(collection).doc(id).set(document, { merge: true }),
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
