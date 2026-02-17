import { useCallback, useEffect, useRef, useState } from 'react'

interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

interface SpringState {
  value: number
  velocity: number
}

export const SPRINGS = {
  snappy: { stiffness: 400, damping: 30, mass: 0.8 },
  bouncy: { stiffness: 300, damping: 20, mass: 1 },
  gentle: { stiffness: 200, damping: 26, mass: 1 },
  stiff: { stiffness: 500, damping: 35, mass: 0.6 },
  lazy: { stiffness: 120, damping: 20, mass: 1.2 }
} as const

function stepSpring(state: SpringState, target: number, config: SpringConfig, dt: number): SpringState {
  const displacement = state.value - target
  const springForce = -config.stiffness * displacement
  const dampingForce = -config.damping * state.velocity
  const acceleration = (springForce + dampingForce) / config.mass
  const newVelocity = state.velocity + acceleration * dt
  const newValue = state.value + newVelocity * dt
  return { value: newValue, velocity: newVelocity }
}

function isSettled(state: SpringState, target: number): boolean {
  return Math.abs(state.value - target) < 0.001 && Math.abs(state.velocity) < 0.001
}

export function useSpring(target: number, config: SpringConfig = SPRINGS.snappy): number {
  const [current, setCurrent] = useState(target)
  const stateRef = useRef<SpringState>({ value: target, velocity: 0 })
  const targetRef = useRef(target)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const configRef = useRef(config)

  targetRef.current = target
  configRef.current = config

  const animate = useCallback(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.064)
    lastTimeRef.current = now

    const steps = 4
    const subDt = dt / steps
    for (let i = 0; i < steps; i++) {
      stateRef.current = stepSpring(stateRef.current, targetRef.current, configRef.current, subDt)
    }

    setCurrent(stateRef.current.value)

    if (!isSettled(stateRef.current, targetRef.current)) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      stateRef.current = { value: targetRef.current, velocity: 0 }
      setCurrent(targetRef.current)
    }
  }, [])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, animate])

  return current
}

export function useMultiSpring(
  targets: Record<string, number>,
  config: SpringConfig = SPRINGS.snappy
): Record<string, number> {
  const [values, setValues] = useState(targets)
  const statesRef = useRef<Record<string, SpringState>>({})
  const targetsRef = useRef(targets)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const configRef = useRef(config)

  targetsRef.current = targets
  configRef.current = config

  for (const key of Object.keys(targets)) {
    if (!statesRef.current[key]) {
      statesRef.current[key] = { value: targets[key] ?? 0, velocity: 0 }
    }
  }

  const animate = useCallback(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.064)
    lastTimeRef.current = now

    let allSettled = true
    const newValues: Record<string, number> = {}

    for (const [key, target] of Object.entries(targetsRef.current)) {
      const state = statesRef.current[key] ?? { value: target, velocity: 0 }
      const steps = 4
      const subDt = dt / steps
      let s = state
      for (let i = 0; i < steps; i++) {
        s = stepSpring(s, target, configRef.current, subDt)
      }
      statesRef.current[key] = s

      if (!isSettled(s, target)) {
        allSettled = false
        newValues[key] = s.value
      } else {
        statesRef.current[key] = { value: target, velocity: 0 }
        newValues[key] = target
      }
    }

    setValues(newValues)
    if (!allSettled) {
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [targets, animate])

  return values
}
