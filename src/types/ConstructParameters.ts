


export type ConstructParameters<
    T extends new (...args: any) => any,
    Ext extends Record<string, any>
> = Omit<NonNullable<ConstructorParameters<T>[1]>, keyof Ext | 'tags'> & Ext
