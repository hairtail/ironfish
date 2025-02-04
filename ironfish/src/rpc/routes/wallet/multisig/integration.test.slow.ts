/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Asset, multisig, verifyTransactions } from '@ironfish/rust-nodejs'
import { Assert } from '../../../../assert'
import { createRouteTest } from '../../../../testUtilities/routeTest'
import { Account, ACCOUNT_SCHEMA_VERSION, AssertMultisigSigner } from '../../../../wallet'

function shuffleArray<T>(array: Array<T>): Array<T> {
  // Durstenfeld shuffle (https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm)
  const shuffledArray = [...array]
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]
  }
  return shuffledArray
}

describe('multisig RPC integration', () => {
  const routeTest = createRouteTest()

  describe('with TDK', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 2 signers (minumum: 2, maximum: 3)', async () => {
      return runTest({
        setupMethod: setupWithTrustedDealer,
        numSigners: 2,
        minSigners: 2,
        numParticipants: 3,
      })
    }, 100000)

    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 5 signers (minumum: 3, maximum: 8)', async () => {
      return runTest({
        setupMethod: setupWithTrustedDealer,
        numSigners: 5,
        minSigners: 3,
        numParticipants: 8,
      })
    }, 100000)

    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 3 signers (minumum: 3, maximum: 3)', () => {
      return runTest({
        setupMethod: setupWithTrustedDealer,
        numSigners: 3,
        minSigners: 3,
        numParticipants: 3,
      })
    }, 100000)
  })

  describe('with DKG', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 2 signers (minumum: 2, maximum: 3)', async () => {
      return runTest({
        setupMethod: setupWithDistributedKeyGen,
        numSigners: 2,
        minSigners: 2,
        numParticipants: 3,
      })
    }, 100000)

    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 5 signers (minumum: 3, maximum: 8)', async () => {
      return runTest({
        setupMethod: setupWithDistributedKeyGen,
        numSigners: 5,
        minSigners: 3,
        numParticipants: 8,
      })
    }, 100000)

    // eslint-disable-next-line jest/expect-expect
    it('should create a verified transaction using 3 signers (minumum: 3, maximum: 3)', () => {
      return runTest({
        setupMethod: setupWithDistributedKeyGen,
        numSigners: 3,
        minSigners: 3,
        numParticipants: 3,
      })
    }, 100000)
  })

  async function runTest(options: {
    numParticipants: number
    minSigners: number
    numSigners: number
    setupMethod: (options: {
      participants: Array<{ name: string; identity: string }>
      minSigners: number
    }) => Promise<{ participantAccounts: Array<Account>; coordinatorAccount: Account }>
  }): Promise<void> {
    const { numParticipants, minSigners, numSigners, setupMethod } = options
    const accountNames = Array.from(
      { length: numParticipants },
      (_, index) => `test-account-${index}`,
    )
    const participants = await createParticipants(accountNames)
    const { participantAccounts, coordinatorAccount } = await setupMethod({
      participants,
      minSigners,
    })
    return createTransaction({ participantAccounts, coordinatorAccount, numSigners })
  }

  function createParticipants(
    participantNames: Array<string>,
  ): Promise<Array<{ name: string; identity: string }>> {
    return Promise.all(
      participantNames.map(async (name) => {
        const identity = (await routeTest.client.wallet.multisig.createParticipant({ name }))
          .content.identity
        return { name, identity }
      }),
    )
  }

  async function setupWithTrustedDealer(options: {
    participants: Array<{ name: string; identity: string }>
    minSigners: number
  }): Promise<{ participantAccounts: Array<Account>; coordinatorAccount: Account }> {
    const { participants, minSigners } = options

    // create the trusted dealer packages
    const trustedDealerPackage = (
      await routeTest.client.wallet.multisig.createTrustedDealerKeyPackage({
        minSigners,
        participants,
      })
    ).content

    // import the accounts generated by the trusted dealer
    const participantAccounts = []
    for (const { name, identity } of participants) {
      const importAccount = trustedDealerPackage.participantAccounts.find(
        (account) => account.identity === identity,
      )
      Assert.isNotUndefined(importAccount)
      await routeTest.client.wallet.importAccount({
        name,
        account: importAccount.account,
        rescan: false,
      })

      const participantAccount = routeTest.wallet.getAccountByName(name)
      Assert.isNotNull(participantAccount)
      participantAccounts.push(participantAccount)
    }

    // import an account to serve as the coordinator
    await routeTest.client.wallet.importAccount({
      account: {
        version: ACCOUNT_SCHEMA_VERSION,
        name: 'coordinator',
        spendingKey: null,
        createdAt: null,
        multisigKeys: {
          publicKeyPackage: trustedDealerPackage.publicKeyPackage,
        },
        ...trustedDealerPackage,
      },
      rescan: false,
    })

    const coordinatorAccount = routeTest.wallet.getAccountByName('coordinator')
    Assert.isNotNull(coordinatorAccount)

    return { participantAccounts, coordinatorAccount }
  }

  async function setupWithDistributedKeyGen(options: {
    participants: Array<{ name: string; identity: string }>
    minSigners: number
  }): Promise<{ participantAccounts: Array<Account>; coordinatorAccount: Account }> {
    const { participants, minSigners } = options

    // perform dkg round 1
    const round1Packages = await Promise.all(
      participants.map(({ name }) =>
        routeTest.client.wallet.multisig.dkg.round1({
          participantName: name,
          minSigners,
          participants,
        }),
      ),
    )

    // perform dkg round 2
    const round2Packages = await Promise.all(
      participants.map(({ name }, index) =>
        routeTest.client.wallet.multisig.dkg.round2({
          participantName: name,
          round1SecretPackage: round1Packages[index].content.round1SecretPackage,
          round1PublicPackages: round1Packages.map((pkg) => pkg.content.round1PublicPackage),
        }),
      ),
    )

    // perform dkg round 3
    const participantAccounts = await Promise.all(
      participants.map(async ({ name }, index) => {
        await routeTest.client.wallet.multisig.dkg.round3({
          participantName: name,
          round2SecretPackage: round2Packages[index].content.round2SecretPackage,
          round1PublicPackages: round1Packages.map((pkg) => pkg.content.round1PublicPackage),
          round2PublicPackages: round2Packages.map((pkg) => pkg.content.round2PublicPackage),
        })

        const participantAccount = routeTest.wallet.getAccountByName(name)
        Assert.isNotNull(participantAccount)
        return participantAccount
      }),
    )

    const viewOnlyAccount = (
      await routeTest.client.wallet.exportAccount({
        account: participants[0].name,
        viewOnly: true,
      })
    ).content.account
    Assert.isNotNull(viewOnlyAccount)
    await routeTest.client.wallet.importAccount({
      name: 'coordinator',
      account: viewOnlyAccount,
      rescan: false,
    })

    const coordinatorAccount = routeTest.wallet.getAccountByName('coordinator')
    Assert.isNotNull(coordinatorAccount)

    return { participantAccounts, coordinatorAccount }
  }

  async function createTransaction(options: {
    participantAccounts: Array<Account>
    coordinatorAccount: Account
    numSigners: number
  }) {
    const { participantAccounts, coordinatorAccount, numSigners } = options

    // select `numSigners` random accounts to sign
    const signerAccounts = shuffleArray(participantAccounts).slice(0, numSigners)

    // fund coordinator account
    // mine block to send IRON to multisig account
    const miner = await routeTest.wallet.createAccount('miner')
    await fundAccount(coordinatorAccount, miner)

    // build list of signers
    const signers = signerAccounts.map((participant) => {
      AssertMultisigSigner(participant)
      const secret = new multisig.ParticipantSecret(
        Buffer.from(participant.multisigKeys.secret, 'hex'),
      )
      return { identity: secret.toIdentity().serialize().toString('hex') }
    })

    // create raw transaction
    const createTransactionResponse = await routeTest.client.wallet.createTransaction({
      account: coordinatorAccount.name,
      outputs: [
        {
          publicAddress: miner.publicAddress,
          amount: '1',
          memo: 'return 1 ORE',
        },
      ],
    })
    const rawTransaction = createTransactionResponse.content.transaction

    // build raw transaction into unsigned transaction
    const buildTransactionResponse = await routeTest.client.wallet.buildTransaction({
      account: coordinatorAccount.name,
      rawTransaction,
    })
    const unsignedTransaction = buildTransactionResponse.content.unsignedTransaction

    // create and collect signing commitments
    const commitments: Array<string> = []
    for (const participantAccount of signerAccounts) {
      AssertMultisigSigner(participantAccount)

      const commitmentResponse = await routeTest.client.wallet.multisig.createSigningCommitment(
        {
          account: participantAccount.name,
          unsignedTransaction,
          signers,
        },
      )

      commitments.push(commitmentResponse.content.commitment)
    }

    // create signing package
    const responseSigningPackage = await routeTest.client.wallet.multisig.createSigningPackage({
      commitments,
      unsignedTransaction,
    })
    const signingPackage = responseSigningPackage.content.signingPackage

    // create and collect signing shares
    const signatureShares: Array<string> = []
    for (const participantAccount of signerAccounts) {
      AssertMultisigSigner(participantAccount)

      const signatureShareResponse =
        await routeTest.client.wallet.multisig.createSignatureShare({
          account: participantAccount.name,
          signingPackage,
        })

      signatureShares.push(signatureShareResponse.content.signatureShare)
    }

    // aggregate signing shares
    const aggregateResponse = await routeTest.client.wallet.multisig.aggregateSignatureShares({
      account: coordinatorAccount.name,
      signingPackage,
      signatureShares,
    })
    expect(aggregateResponse.status).toEqual(200)

    const verified = verifyTransactions([
      Buffer.from(aggregateResponse.content.transaction, 'hex'),
    ])
    expect(verified).toBe(true)
  }

  async function fundAccount(account: Account, miner: Account): Promise<void> {
    Assert.isNotNull(miner.spendingKey)
    await routeTest.wallet.updateHead()

    const minersfee = await routeTest.chain.createMinersFee(
      0n,
      routeTest.chain.head.sequence + 1,
      miner.spendingKey,
    )
    const newBlock = await routeTest.chain.newBlock([], minersfee)
    const addResult = await routeTest.chain.addBlock(newBlock)
    expect(addResult.isAdded).toBeTruthy()

    await routeTest.wallet.updateHead()

    const transaction = await routeTest.wallet.send({
      account: miner,
      outputs: [
        {
          publicAddress: account.publicAddress,
          amount: BigInt(2),
          memo: Buffer.from(''),
          assetId: Asset.nativeId(),
        },
      ],
      fee: BigInt(0),
    })

    // Create a block with a miner's fee and the transaction to send IRON to the multisig account
    const minersfee2 = await routeTest.chain.createMinersFee(
      transaction.fee(),
      newBlock.header.sequence + 1,
      miner.spendingKey,
    )
    const newBlock2 = await routeTest.chain.newBlock([transaction], minersfee2)
    const addResult2 = await routeTest.chain.addBlock(newBlock2)
    expect(addResult2.isAdded).toBeTruthy()

    await routeTest.wallet.updateHead()
  }
})
