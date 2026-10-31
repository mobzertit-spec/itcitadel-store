import { useSyncExternalStore } from 'react'

/*
 * One clock for the whole page, ticking each second only while something shows time (an offer's countdown, its
 * price): offers end on screen without a reload, with a single timer however many prices are shown.
 */
let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const read = () => now
const still = () => () => {}

/**
 * The current time in milliseconds, refreshed every second while `live` (pass false when nothing shown depends on
 * the second, e.g. no plan has an offer: no timer runs at all).
 */
export const useNow = (live = true) => useSyncExternalStore(live ? subscribe : still, read, read)
