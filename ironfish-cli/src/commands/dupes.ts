/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Assert, IronfishNode, RpcMemoryClient } from '@ironfish/sdk'
import { TransactionHash } from '@ironfish/sdk/src/primitives/transaction'
import LRU from 'blru'
import { BufferMap } from 'buffer-map'
import { IronfishCommand } from '../command'
import { RemoteFlags } from '../flags'

export default class Dupes extends IronfishCommand {
  static flags = {
    ...RemoteFlags,
  }

  node: IronfishNode | null = null

  async start(): Promise<void> {
    await this.parse(Dupes)

    const lru = new LRU<TransactionHash, number>(25000, null, BufferMap)

    const node = await this.sdk.node()
    await node.openDB()

    const startSequence = 1
    const endSequence = 500

    const startHeader = await node.chain.getHeaderAtSequence(startSequence)
    const endHeader = await node.chain.getHeaderAtSequence(endSequence)

    Assert.isNotNull(startHeader)
    Assert.isNotNull(endHeader)

    const endHash = endHeader.hash

    let dupeCount = 0
    let lastAnnounced = 0
    for await (const { transaction, sequence } of node.chain.iterateTransactions(
      null,
      endHash,
    )) {
      const txHash = transaction.hash()
      const txHashHex = txHash.toString('hex')

      if (sequence % 1000 === 0 && lastAnnounced !== sequence) {
        console.log('Sequence', sequence)
        lastAnnounced = sequence
      }

      const previousSeq = lru.get(txHash)
      if (previousSeq) {
        dupeCount += 1
        console.log(
          `Sequence ${sequence} has tx ${txHashHex}, first seen seq: ${previousSeq}, dupe count ${dupeCount}`,
        )
        continue
      }

      lru.set(txHash, sequence)
    }

    this.exit(0)
  }
}
