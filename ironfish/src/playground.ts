/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  BoxKeyPair,
  Foo,
  FooObj,
  generateKey,
  isValidPublicAddress,
  randomBytes,
  randomBytesBuffer,
  randomBytesString,
  randomBytesVec,
} from '@ironfish/rust-nodejs'
import { BenchUtils } from './utils/bench'
import { PromiseUtils } from './utils/promise'

const pauseAndGc = async (milliseconds: number) => {
  await PromiseUtils.sleep(milliseconds)
  for (let i = 0; i < 5; ++i) {
    global.gc && global.gc()
  }
}

const withSegment = async (title: string, fn: () => Promise<void> | void): Promise<string> => {
  const segment = BenchUtils.startSegment()
  await fn()
  const segmentResults = BenchUtils.endSegment(segment)
  return BenchUtils.renderSegment(segmentResults, title, '\n\t')
}

class JsFoo {}

async function testFn(title: string, fn: () => Promise<void> | void) {
  console.log('is gc?', global.gc != null)
  const test_counts = [1, 25, 10_000, 75_000, 250_000, 1_000_000, 2_000_000]

  // const results: string[] = []

  const overallSegment = BenchUtils.startSegment()

  await pauseAndGc(10)

  for (const TEST_COUNT of test_counts) {
    const result = await withSegment(
      `${title} - ${TEST_COUNT.toLocaleString()} iterations`,
      async () => {
        for (let i = 0; i < TEST_COUNT; i += 1) {
          await fn()
          if (i % 5000 === 0) {
            await PromiseUtils.sleep(10)
          }
        }
        await pauseAndGc(10)
      },
    )
    // results.push(result)
    console.info(result)

    await pauseAndGc(10)
  }

  const endOverall = BenchUtils.endSegment(overallSegment)
  console.info(BenchUtils.renderSegment(endOverall, 'Overall', '\n\t'))

  // console.log(results.join('\n'))
}

async function testRandomBytes(test_count: number) {
  const results = [`Number of iterations: ${test_count.toLocaleString()}`]

  const tests = [
    {
      id: Math.random(),
      title: 'Rust String > Buffer',
      fn: randomBytesString,
    },
    {
      id: Math.random(),
      title: 'Rust JsBuffer',
      fn: randomBytesVec,
    },
    {
      id: Math.random(),
      title: 'NodeJs Buffer',
      fn: randomBytes,
    },
    {
      id: Math.random(),
      title: 'Rust Buffer',
      fn: randomBytesBuffer,
    },
  ]
  tests.sort(() => Math.random() - 0.5)

  await pauseAndGc(10)

  for (const test of tests) {
    const result = await withSegment(test.title, async () => {
      for (let i = 0; i < test_count; i += 1) {
        test.fn(32)
        if (i % 5000 === 0) {
          await PromiseUtils.sleep(10)
        }
      }
      await pauseAndGc(10)
    })

    results.push(result)
  }

  console.log(results.join('\n'))
}

async function main() {
  // 2.2 - no leaks? cant remember
  // 2.9 - no leaks
  // 2.9+ - no leaks
  // await testFn('Object', () => {
  //   const x = {} as FooObj
  // })
  //
  // 2.2 - leaks
  // 2.9 - leaks
  // 2.9+ - no leaks
  // await testFn('Object', () => {
  //   const x = new Foo()
  // })
  //
  // 2.2 - JsBuffer leaks
  // 2.9 - no leaks
  // 2.9+ - no leaks
  // await testRandomBytes(1_000_000)
  // await pauseAndGc(100)
  // await testRandomBytes(3_000_000)
  //
  // 2.9+ - don't think this leaks, but only testing up to 50k iterations cause its slow
  // await testFn('bool real fn', () => {
  //   const x = isValidPublicAddress(
  //     '60368175a9b4328f5f692b2b3585845cc05469cb2e4582f781d4fac54e90838a65022dce078dd3a8e3f090',
  //   )
  // })
  //
  // 2.9+ - don't think this leaks
  // await testFn('generate key, returns obj with strings', () => {
  //   const x = generateKey()
  // })
  //
  // 2.9+ - don't think this leaks
  // await testFn('actual boxkeypair', () => {
  //   const x = new BoxKeyPair()
  // })
  //
  // 2.9+ - don't think this leaks
  await testFn('actual boxkeypair from hex', () => {
    const x = BoxKeyPair.fromHex(
      'e9cd0c56d0c09e3bfc392039665474ad68438de484363f32087093927812983b',
    )
  })
}

void main()
