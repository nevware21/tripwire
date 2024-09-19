import { IAssertScope } from "./IAssertScope";

/**
 * The function that returns the handlers for creating new assertion instances.
 * @since 0.1.0
 * @group Expect
 */
export type AssertInstHandlers = () => IAssertInstHandlers;

/**
 * The interface that defines the handlers for creating new assertion instances.
 * This interface is used to create new instances of the assertion object with
 * the default functions and operations, as well as creating new empty instances
 * that do not have the default functions and operations.
 * @since 0.1.0
 * @group Expect
 */
export interface IAssertInstHandlers {
    /**
     * Creates a new "full" assertion object instance using the scope provided,
     * this call creates a new instance with all default functions and operations.
     * @param scope - The parent / owning scope of the new instance.
     * @returns - The new assert instance.
     */
    newAssertInst: (scope: IAssertScope) => any;

    /**
     * Creates a new "empty" (no default functions) assertion object instance using
     * the scope provided, this call normally occurs in operators that extend the
     * instance by adding operation specific functions and operations while still
     * honoring the general runtime instances.
     * @param scope - The parent / owning scope of the new instance.
     * @returns - The new empty assert instance
     */
    newEmptyAssertInst: (scope: IAssertScope) => any;
}