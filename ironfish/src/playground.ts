/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Foo,
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

async function testBoxKeyPair() {
  console.log('is gc?', global.gc != null)
  const test_counts = [1, 25, 10_000, 250_000, 1_000_000]

  const results: string[] = []
  // const bufList = []

  const overallSegment = BenchUtils.startSegment()

  await pauseAndGc(1000)

  for (const TEST_COUNT of test_counts) {
    const result = await withSegment(
      `BoxKeyPair - ${TEST_COUNT.toLocaleString()} iterations`,
      async () => {
        for (let i = 0; i < TEST_COUNT; i += 1) {
          // new JsFoo()
          new Foo()
          // const x = new JsFoo()
          // if (i == 5) {
          //   bufList.push(x)
          // }
          if (i % (TEST_COUNT / 10) === 0) {
            // await PromiseUtils.sleep(1000)
            await pauseAndGc(1000)
          }
        }
        await pauseAndGc(2000)
        await pauseAndGc(2000)
        await pauseAndGc(2000)
      },
    )
    results.push(result)

    await pauseAndGc(1000)
  }

  await pauseAndGc(1000)
  await pauseAndGc(2000)
  await pauseAndGc(4000)
  await pauseAndGc(4000)
  await pauseAndGc(5000)

  const endOverall = BenchUtils.endSegment(overallSegment)
  results.push(BenchUtils.renderSegment(endOverall, 'Overall', '\n\t'))

  console.log(results.join('\n'))
}

async function testRandomBytes(test_count: number) {
  // const TEST_COUNT = 2_000_000
  // const TEST_COUNT = 50_000

  const results = [`Number of iterations: ${test_count.toLocaleString()}`]
  const bufList = []

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

  await pauseAndGc(1000)

  for (const test of tests) {
    const result = await withSegment(test.title, async () => {
      for (let i = 0; i < test_count; i += 1) {
        const x = test.fn(32)
        if (i == 5) {
          bufList.push(x)
        }
        if (i % 5000 === 0) {
          await pauseAndGc(10)
          // await PromiseUtils.sleep(1000)
        }
      }
      await pauseAndGc(500)
      await pauseAndGc(1000)
      await pauseAndGc(4000)
    })

    results.push(result)
  }

  console.log(results.join('\n'))
  await pauseAndGc(1000)
}
// testBoxKeyPair()

async function main() {
  await testRandomBytes(1)
  await pauseAndGc(1000)
  await testRandomBytes(25)
  await pauseAndGc(1000)
  await testRandomBytes(1_000_000)
  await pauseAndGc(1000)
  await testRandomBytes(5_000_000)
  await pauseAndGc(1000)
  await testRandomBytes(20_000_000)
}

void main()
