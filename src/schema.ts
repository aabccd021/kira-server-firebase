type Dictionary<T> = Record<string, T>;

export type StringField = {
  type: 'string';
};

export type CountField = {
  type: 'count';
  countedCol: string;
  groupByRef: string;
};

export type ImageField = {
  type: 'image';
};

export type CreationTimestampField = {
  type: 'creationTime';
};

export type OwnerField = {
  type: 'owner';
  syncFields?: Dictionary<true>;
};

export type ReferenceField = {
  type: 'ref';
  refCol: string;
  syncFields?: Dictionary<true>;
};

export type Field =
  | CountField
  | CreationTimestampField
  | ImageField
  | OwnerField
  | ReferenceField
  | StringField;

export type Schema = {
  userCol: string;
  cols: Dictionary<Dictionary<Field>>;
};
