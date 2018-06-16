import { Class, ObjectType, Prototype } from '../types/core';
import { ColumnMetadata, IColumnMetadata } from './column';
import { DatabaseMetadata } from './database';
import { EntityMetadata, IEntityMetadata } from './entity';
import { Registry } from './registry';

/**
 * All types that relation can be.
 */
export enum RelationType {
  OneToOne = 'one-to-one',
  OneToMany = 'one-to-many',
  ManyToOne = 'many-to-one',
  ManyToMany = 'many-to-many',
}

/**
 * ON_DELETE type to be used to specify delete strategy when some relation is being deleted from the database.
 */
export declare type OnDeleteType = 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'DEFAULT' | 'NO ACTION';

/**
 * ON_UPDATE type to be used to specify update strategy when some relation is being updated.
 */
export declare type OnUpdateType = 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'DEFAULT';

/**
 * Describes all relation's options.
 */
export interface RelationOptions {
  /**
   * Indicates if relation column value can be nullable or not.
   */
  nullable?: boolean;
  /**
   * Database cascade action on delete.
   */
  onDelete?: OnDeleteType;
  /**
   * Database cascade action on update.
   */
  onUpdate?: OnUpdateType;
  /**
   * Indicates if this relation will be a primary key.
   * Can be used only for many-to-one and owner one-to-one relations.
   */
  primary?: boolean;
  /**
   * Set this relation to be lazy. Note: lazy relations are promises. When you call them they return promise
   * which resolve relation result then. If your property's type is Promise then this relation is set to lazy automatically.
   */
  lazy?: boolean;
  /**
   * Set this relation to be eager.
   * Eager relations are always loaded automatically when relation's owner entity is loaded using find* methods.
   * Only using QueryBuilder prevents loading eager relations.
   * Eager flag cannot be set from both sides of relation - you can eager load only one side of the relationship.
   */
  eager?: boolean;
  /**
   * Indicates if persistence is enabled for the relation.
   * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
   * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
   * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
   */
  persistence?: boolean;
}

/**
 * Describes join column options.
 */
export interface JoinColumnOptions {
  /**
   * Name of the column.
   */
  name?: string;
  /**
   * Name of the column in the entity to which this column is referenced.
   */
  referencedColumnName?: string;
}

export interface IRelationMetadata<T = any> {
  target: Class;
  /**
   * Entity metadata of the entity where this relation is placed.
   *
   * For example for @ManyToMany(type => Category) in Post, entityMetadata will be metadata of Post entity.
   */
  entityMetadata: IEntityMetadata;
  /**
   * Target's property name to which relation decorator is applied.
   */
  propertyName: string;
  /**
   * Relation type, e.g. is it one-to-one, one-to-many, many-to-one or many-to-many.
   */
  relationType: RelationType;
  /**
   * Entity metadata of the entity that is targeted by this relation.
   *
   * For example for @ManyToMany(type => Category) in Post, inverseEntityMetadata will be metadata of Category entity.
   */
  inverseEntityMetadata: IEntityMetadata;
  /**
   * Gets the relation metadata of the inverse side of this relation.
   */
  inverseRelation?: IRelationMetadata<T>;
  /**
   * Join table columns.
   * Join columns can be obtained only from owner side of the relation.
   * From non-owner side of the relation join columns will be empty.
   * If this relation is a many-to-one/one-to-one then it takes join columns from the current entity.
   * If this relation is many-to-many then it takes all owner join columns from the junction entity.
   */
  joinColumns: IColumnMetadata[];
}

export class RelationMetadata<T = any> implements IRelationMetadata<T> {

  public target: Class = undefined;
  public propertyName: string = undefined;
  public relationType: RelationType = undefined;
  public entityMetadata: EntityMetadata = undefined;
  public inverseEntityMetadata: EntityMetadata = undefined;
  public inverseRelation?: RelationMetadata<T> = undefined;
  public joinColumns: ColumnMetadata[] = undefined;

  private joinOptions: JoinColumnOptions[] = [];
  private typeFunction: (type?: any) => ObjectType<T>;
  private inverseSide: (object: T) => any;

  private constructor(target: Class, propertyKey: string) {
    this.target = target;
    this.propertyName = propertyKey;
  }

  public static has(target: Prototype, propertyKey: string): boolean {
    return Reflect.hasMetadata(Registry.TYX_RELATION, target, propertyKey);
  }

  public static get(target: Prototype, propertyKey: string): RelationMetadata<any> {
    return Reflect.getMetadata(Registry.TYX_RELATION, target, propertyKey);
  }

  public static define(target: Prototype, propertyKey: string): RelationMetadata<any> {
    let meta = this.get(target, propertyKey);
    if (!meta) meta = new RelationMetadata(target.constructor, propertyKey);
    Reflect.defineMetadata(Registry.TYX_RELATION, meta, target, propertyKey);
    return meta;
  }

  public commit(
    type: RelationType,
    typeFunction: (type?: any) => ObjectType<T>,
    inverseSide: (object: T) => any,
    options: RelationOptions,
  ): this {
    this.relationType = type;
    this.typeFunction = typeFunction;
    this.inverseSide = inverseSide;
    EntityMetadata.define(this.target).addRelation(this);
    return this;
  }

  public addJoinColumn(options: JoinColumnOptions) {
    this.joinOptions.push(options);
  }

  public resolve(database: DatabaseMetadata, entity: EntityMetadata): void {
    this.entityMetadata = entity;
    this.joinColumns = this.joinOptions.map(opt => entity.members[opt.name] as ColumnMetadata);
    const inverseEntity = this.typeFunction();
    this.inverseEntityMetadata = database.entities.find(e => e.target === inverseEntity);
    this.inverseRelation = this.inverseSide(this.inverseEntityMetadata.members as any);
    if (!(this.inverseRelation instanceof RelationMetadata)) throw new TypeError(`Invalid inverse relation`);
    // TODO: More validations and optional inverse relation
    const key = `${entity.name}.${this.propertyName}`;
    Registry.RelationMetadata[key] = this;
    database.relations.push(this);
  }
}
