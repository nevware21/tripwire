/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * A generic type for getter/setter functions that support both getter and setter functionality
 * with method chaining. This pattern is commonly used for properties like timeout and slow thresholds
 * where you can either retrieve the current value or set a new value and continue chaining.
 *
 * @typeParam TContext - The context type that the accessor belongs to, used for return type when setting
 * @typeParam TValue - The type of the value being accessed (typically number)
 *
 * @example
 * ```typescript
 * // Getter usage
 * const currentTimeout: number = context.timeout();
 *
 * // Setter usage with chaining
 * context.timeout(5000).slow(1000);
 * ```
 *
 * @since 0.2.0
 */
export type IGetSetChainableFn<TContext, TValue> = {
    /**
     * Gets the current property value
     * @returns The current value of the property
     */
    (): TValue;

    /**
     * Sets the property value
     * @param value - The new value to set
     * @returns The context instance for method chaining
     */
    (value?: TValue): TContext;
};
