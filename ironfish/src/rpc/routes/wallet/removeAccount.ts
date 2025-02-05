/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as yup from 'yup'
import { ApiNamespace, router } from '../router'
import { getAccount } from './utils'

export type RemoveAccountRequest = { account: string; confirm?: boolean }
export type RemoveAccountResponse = { needsConfirm?: boolean }

export const RemoveAccountRequestSchema: yup.ObjectSchema<RemoveAccountRequest> = yup
  .object({
    account: yup.string().defined(),
    confirm: yup.boolean().optional(),
  })
  .defined()

export const RemoveAccountResponseSchema: yup.ObjectSchema<RemoveAccountResponse> = yup
  .object({
    needsConfirm: yup.boolean().optional(),
  })
  .defined()

router.register<typeof RemoveAccountRequestSchema, RemoveAccountResponse>(
  `${ApiNamespace.wallet}/remove`,
  RemoveAccountRequestSchema,
  async (request, node): Promise<void> => {
    const account = getAccount(node, request.data.account)

    if (!request.data.confirm) {
      const balances = await account.getUnconfirmedBalances()

      for (const [_, { unconfirmed }] of balances) {
        if (unconfirmed !== 0n) {
          request.end({ needsConfirm: true })
          return
        }
      }
    }

    await node.wallet.removeAccountByName(account.name)
    request.end({})
  },
)
