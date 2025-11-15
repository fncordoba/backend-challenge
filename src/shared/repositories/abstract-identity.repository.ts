export abstract class AbstractIdentityRepository<T, ID = string> {
  abstract findById(id: ID): Promise<T | null>;
  abstract create(entity: T): Promise<T>;
  abstract update(entity: T): Promise<T>;
  abstract delete(id: ID): Promise<void>;

  protected async beforeCreate?(entity: T): Promise<void>;
  protected async afterCreate?(entity: T): Promise<void>;
}

