import { Orm } from '../import';
import { EntityMetadata, EntityOptions } from '../metadata/entity';
import { Registry } from '../metadata/registry';

// tslint:disable-next-line:function-name
export function Entity(options?: EntityOptions): ClassDecorator {
  return (target) => {
    Registry.trace(Entity, { options }, target);
    EntityMetadata.define(target).commit(options);
    return Orm.Entity(options)(target);
  };
}
