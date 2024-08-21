/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPropertyResultOp } from "../ops/IPropertyResultOp";
import { MsgSource } from "../types";

/**
 * Represents a function that defines a property assertion for a given name.
 * Asserts that the property `name` exists on the target object.
 */
export interface PropertyFn {
    /**
     * Asserts that the property exists on the target object.
     * @template T - The type of the property value.
     * @param name - The name of the property.
     * @param value - The expected value of the property.
     * @param evalMsg - The evaluation message source.
     * @returns A new assertion instance `this` with the value of the property.
     * @throws {@link AssertionFailure} if the property does not exist.
     * @throws {@link AssertionFailure} if the property value does not match the expected value.
     */
    <T>(name: string | symbol | number, value?: T, evalMsg?: MsgSource): IPropertyResultOp;
}

/**
 * Represents a function that defines a property descriptor assertion for a given name.
 */
export interface PropertyDescriptorFn {
    /**
     * Asserts that the property descriptor exists on the target object.
     * @param name - The name of the property.
     * @param descriptor - The property descriptor to validate.
     * @param evalMsg - The evaluation message source.
     * @returns A new assertion instance `this` with the value of the property.
     * @throws {@link AssertionFailure} if no property descriptor is found.
     * @throws {@link AssertionFailure} if the property descriptor does not match the expected descriptor.
     */
    (name: string | symbol | number, descriptor?: PropertyDescriptor, evalMsg?: MsgSource): IPropertyResultOp;
}
