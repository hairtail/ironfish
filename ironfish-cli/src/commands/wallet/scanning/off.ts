/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IronfishCommand } from '../../../command'
import { RemoteFlags } from '../../../flags'

export class ScanningOffCommand extends IronfishCommand {
  static description = `Turn off scanning for an account. The wallet will no longer scan the blockchain for new account transactions.`

  static flags = {
    ...RemoteFlags,
  }

  static args = [
    {
      name: 'account',
      required: true,
      description: 'Name of the account to update',
    },
  ]

  async start(): Promise<void> {
    const { args } = await this.parse(ScanningOffCommand)
    const account = args.account as string

    const client = await this.sdk.connectRpc()

    await client.wallet.setScanning({
      account: account,
      enabled: false,
    })
    this.log(`Turned off scanning for account ${account}.`)
  }
}
