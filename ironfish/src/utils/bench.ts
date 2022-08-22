/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { FileUtils } from './file'
import { TimeUtils } from './time'

type SegmentResults = {
  time: number
  heap: number
  rss: number
  mem: number
  arrayBuffers: number
  external: number
}

type Segment = {
  time: HRTime
  heap: number
  rss: number
  mem: number
  arrayBuffers: number
  external: number
}

type HRTime = [seconds: number, nanoseconds: number]

function startTime(): HRTime {
  return process.hrtime()
}

/**
 * @returns milliseconds since start
 */
function endTime(start: HRTime): number {
  const [sec, nanosec] = process.hrtime(start)
  return sec * 1000 + nanosec / 1e6
}
function diffTime(startTime: HRTime, endTime: HRTime): number {
  const [secStart, nanosecStart] = startTime
  const [secEnd, nanosecEnd] = endTime

  const start = secStart * 1000 + nanosecStart / 1e6
  const end = secEnd * 1000 + nanosecEnd / 1e6

  return end - start
}

function getSegment(): Segment {
  const time = startTime()

  if (global.gc) {
    // Need to mark and sweep multiple times to try to collect all of it. You
    // could also just continue to do this until memory stabilizies but this
    // is good enough.
    for (let i = 0; i < 5; ++i) {
      global.gc()
    }
  }
  const startMem = process.memoryUsage()
  const heap = startMem.heapUsed
  const rss = startMem.rss
  const external = startMem.external
  const arrayBuffers = startMem.arrayBuffers
  const mem = heap + rss

  return { time, heap, rss, mem, external, arrayBuffers }
}

function startSegment(): Segment {
  return getSegment()
}

function endSegment(start: Segment): SegmentResults {
  const end = getSegment()

  return {
    time: diffTime(start.time, end.time),
    heap: end.heap && start.heap ? end.heap - start.heap : 0,
    rss: end.rss && start.rss ? end.rss - start.rss : 0,
    mem: end.mem && start.mem ? end.mem - start.mem : 0,
    external: end.external && start.external ? end.external - start.external : 0,
    arrayBuffers:
      end.arrayBuffers && start.arrayBuffers ? end.arrayBuffers - start.arrayBuffers : 0,
  }
}

function renderSegment(segment: SegmentResults, title = 'Benchmark', delimeter = ', '): string {
  const result = []

  result.push(`Time: ${TimeUtils.renderSpan(segment.time)}`)

  result.push(`Heap: ${FileUtils.formatMemorySize(segment.heap)}`)
  result.push(`RSS: ${FileUtils.formatMemorySize(segment.rss)}`)
  result.push(`External: ${FileUtils.formatMemorySize(segment.external)}`)
  result.push(`ArrayBuffers: ${FileUtils.formatMemorySize(segment.arrayBuffers)}`)
  result.push(`Mem: ${FileUtils.formatMemorySize(segment.mem)}`)

  let rendered = result.join(delimeter)

  if (title) {
    rendered = `${title} - ` + rendered
  }

  return rendered
}

export const BenchUtils = {
  start: startTime,
  end: endTime,
  startSegment,
  endSegment,
  renderSegment,
}
