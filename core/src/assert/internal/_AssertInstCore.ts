/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInstCore } from "../interface/IAssertInstCore";
import { _addAssertInstFuncs, _clearUserInstFuncs } from "./_addAssertInstFuncs";
import { IAssertInst } from "../interface/IAssertInst";
import { coreFunctions } from "./_baseFunctions";
import { _AssertInstBase } from "./_AssertInstBase";

/**
 * @internal
 * @ignore
 * Flag to ensure that the core instance class has dynamically had it's
 * functions added to it's prototype.
 */
let _assertCoreFuncsAdded = false;

/**
 * @internal
 * @ignore
 * Flag to ensure that the empty instance class has dynamically had it's
 * functions added to it's prototype.
 */
// let _assertEmptyFuncsAdded = false;

/**
 * @internal
 * @ignore
 * This is the core instance class where all of the core assertion functions and properties
 * are registered, so that they can be used by the user. User extension functions/properties
 * are not associated with this class they are added to the {@link _AssertInst} class. This
 * class is not exported and cannot be directly instantiated by the user.
 */
class _AssertInstCore extends _AssertInstBase {
    /**
     * The constructor for the core assertion instance class.
     */
    protected constructor() {
        super();
        if (!_assertCoreFuncsAdded) {
            _addAssertInstFuncs(_AssertInstCore.prototype, coreFunctions, false);
            _assertCoreFuncsAdded = true;
        }
    }
}

/**
 * @internal
 * @ignore
 * This is the first of the two primary instance classes that are instantiated when creating
 * a new assertion instance. It is also where any user registered instance functions are added.
 * This class is not exported and cannot be directly instantiated by the user.
 */
class _AssertInst extends _AssertInstCore {
    /**
     * The constructor for the assertion instance class.
     */
    constructor() {
        super();
    }
}

/**
 * @internal
 * @ignore
 * This is the empty instance class that is instantiated when creating a new empty
 * instance, with no inherited operations. This class is not exported and cannot
 * be directly instantiated by the user.
 * @template T - The type of the value being asserted.
 */
class _EmptyAssertInst extends _AssertInstBase {

    /**
     * The constructor for the empty instance class.
     */
    constructor() {
        super();
    }
}

/**
 * @internal
 * @ignore
 * Creates a new {@link IAssertInst} instance.
 * @returns - The new instance.
 */
export function _createAssertInst(): IAssertInst {
    return new _AssertInst() as unknown as IAssertInst;
}

/**
 * @internal
 * @ignore
 * Creates a new empty {@link IAssertInstCore} instance.
 * @returns - The new instance.
 */
export function _createEmptyAssertInst(): IAssertInstCore {
    return new _EmptyAssertInst() as unknown as IAssertInstCore;
}

/**
 * @internal
 * @ignore
 * Returns the Assert Inst prototype to assign the user defined functions
 * to the prototype.
 * @returns - The prototype of the Assert Inst.
 */
export function _getAssertProto(): any {
    return _AssertInst.prototype;
}

/**
 * @internal
 * @ignore
 * Clears all of the user defined instance functions from the Assert inst
 * prototype.
 * Used for testing purposes only.
 */
export function _clearAssertInstFuncs() {
    _clearUserInstFuncs(_AssertInst.prototype);
}
