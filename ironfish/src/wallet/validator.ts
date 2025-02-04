/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  generatePublicAddressFromIncomingViewKey,
  isValidPublicAddress as nativeIsValidPublicAddress,
} from '@ironfish/rust-nodejs'
import { AccountValue } from './walletdb/accountValue'

const SPENDING_KEY_LENGTH = 64
const INCOMING_VIEW_KEY_LENGTH = 64
const OUTGOING_VIEW_KEY_LENGTH = 64
const VIEW_KEY_LENGTH = 128

export function isValidPublicAddress(publicAddress: string): boolean {
  return nativeIsValidPublicAddress(publicAddress)
}

export function isValidSpendingKey(spendingKey: string): boolean {
  return spendingKey.length === SPENDING_KEY_LENGTH && haveAllowedCharacters(spendingKey)
}

export function isValidIncomingViewKey(incomingViewKey: string): boolean {
  return (
    incomingViewKey.length === INCOMING_VIEW_KEY_LENGTH &&
    haveAllowedCharacters(incomingViewKey)
  )
}

export function isValidOutgoingViewKey(outgoingViewKey: string): boolean {
  return (
    outgoingViewKey.length === OUTGOING_VIEW_KEY_LENGTH &&
    haveAllowedCharacters(outgoingViewKey)
  )
}

export function isValidIVKAndPublicAddressPair(ivk: string, publicAddress: string): boolean {
  return generatePublicAddressFromIncomingViewKey(ivk) === publicAddress
}

export function isValidViewKey(viewKey: string): boolean {
  return viewKey.length === VIEW_KEY_LENGTH && haveAllowedCharacters(viewKey)
}

export function validateAccount(toImport: Partial<AccountValue>): void {
  if (!toImport.name) {
    throw new Error(`Imported account has no name`)
  }

  if (!toImport.publicAddress) {
    throw new Error(`Imported account has no public address`)
  }

  if (!isValidPublicAddress(toImport.publicAddress)) {
    throw new Error(`Provided public address ${toImport.publicAddress} is invalid`)
  }

  if (!toImport.outgoingViewKey) {
    throw new Error(`Imported account has no outgoing view key`)
  }

  if (!isValidOutgoingViewKey(toImport.outgoingViewKey)) {
    throw new Error(`Provided outgoing view key ${toImport.outgoingViewKey} is invalid`)
  }

  if (!toImport.incomingViewKey) {
    throw new Error(`Imported account has no incoming view key`)
  }

  if (!isValidIncomingViewKey(toImport.incomingViewKey)) {
    throw new Error(`Provided incoming view key ${toImport.incomingViewKey} is invalid`)
  }

  if (!toImport.viewKey) {
    throw new Error(`Imported account has no view key`)
  }

  if (!isValidViewKey(toImport.viewKey)) {
    throw new Error(`Provided view key ${toImport.viewKey} is invalid`)
  }

  if (toImport.spendingKey && !isValidSpendingKey(toImport.spendingKey)) {
    throw new Error(`Provided spending key ${toImport.spendingKey} is invalid`)
  }

  if (!isValidIVKAndPublicAddressPair(toImport.incomingViewKey, toImport.publicAddress)) {
    const generatedPublicAddress = generatePublicAddressFromIncomingViewKey(
      toImport.incomingViewKey,
    )
    throw new Error(
      `Public address ${toImport.publicAddress} does not match public address generated from incoming view key ${generatedPublicAddress}`,
    )
  }
}

function haveAllowedCharacters(text: string): boolean {
  const validInputRegex = /^[0-9a-f]+$/
  return validInputRegex.exec(text.toLowerCase()) != null
}
