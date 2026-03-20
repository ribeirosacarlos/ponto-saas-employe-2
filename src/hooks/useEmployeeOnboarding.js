import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { driver } from 'driver.js'

const STORAGE_KEY = 'jornafy_employee_onboarding_completed'
const POPOVER_CLASS = 'jornafy-onboarding-popover employee-onboarding-popover'
const START_DELAY_MS = 320

const buildTourSteps = (t) => [
  {
    element: '[data-tour="employee-home"]',
    popover: {
      title: t('employeeOnboarding.steps.home.title'),
      description: t('employeeOnboarding.steps.home.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="employee-clock-button"]',
    popover: {
      title: t('employeeOnboarding.steps.clock.title'),
      description: t('employeeOnboarding.steps.clock.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="employee-history"]',
    popover: {
      title: t('employeeOnboarding.steps.history.title'),
      description: t('employeeOnboarding.steps.history.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="employee-adjustments"]',
    popover: {
      title: t('employeeOnboarding.steps.adjustments.title'),
      description: t('employeeOnboarding.steps.adjustments.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    popover: {
      title: t('employeeOnboarding.steps.final.title'),
      description: t('employeeOnboarding.steps.final.description'),
      side: 'over',
      align: 'center',
    },
  },
]

const getCompletionState = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

const setCompletionState = (completed) => {
  if (typeof window === 'undefined') return
  if (completed) {
    window.localStorage.setItem(STORAGE_KEY, '1')
    return
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

const resolveAvailableSteps = (steps) =>
  steps.filter((step) => {
    if (!step.element) return true
    return Boolean(document.querySelector(step.element))
  })

export function useEmployeeOnboarding({ enabled = false, autoStart = true } = {}) {
  const { t } = useTranslation()
  const driverRef = useRef(null)
  const autoStartedRef = useRef(false)
  const suppressCompletionRef = useRef(false)

  const destroyDriver = (suppressCompletion = false) => {
    if (!driverRef.current) return
    suppressCompletionRef.current = suppressCompletion
    driverRef.current.destroy()
    driverRef.current = null
    window.setTimeout(() => {
      suppressCompletionRef.current = false
    }, 0)
  }

  const start = ({ force = false } = {}) => {
    if (typeof window === 'undefined' || !enabled) return false
    if (!force && getCompletionState()) return false

    destroyDriver(true)

    const steps = resolveAvailableSteps(buildTourSteps(t))
    if (!steps.length) return false

    const instance = driver({
      showProgress: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.14,
      stagePadding: 14,
      stageRadius: 24,
      nextBtnText: t('employeeOnboarding.actions.next'),
      prevBtnText: t('employeeOnboarding.actions.previous'),
      doneBtnText: t('employeeOnboarding.actions.done'),
      popoverClass: POPOVER_CLASS,
      steps,
      onDestroyed: () => {
        driverRef.current = null
        if (!suppressCompletionRef.current) {
          setCompletionState(true)
        }
      },
    })

    driverRef.current = instance
    window.requestAnimationFrame(() => {
      instance.drive()
    })

    return true
  }

  const restart = () => {
    if (typeof window === 'undefined' || !enabled) return false
    setCompletionState(false)
    autoStartedRef.current = true
    destroyDriver(true)
    return start({ force: true })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    window.restartEmployeeOnboarding = restart

    return () => {
      if (window.restartEmployeeOnboarding === restart) {
        delete window.restartEmployeeOnboarding
      }
    }
  }, [restart])

  useEffect(() => {
    if (!enabled) {
      autoStartedRef.current = false
      destroyDriver(true)
      return undefined
    }

    if (!autoStart || autoStartedRef.current || getCompletionState()) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const started = start()
      if (started) {
        autoStartedRef.current = true
      }
    }, START_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [autoStart, enabled, t])

  useEffect(
    () => () => {
      destroyDriver(true)
    },
    [],
  )

  return {
    startEmployeeOnboarding: start,
    restartEmployeeOnboarding: restart,
    completeEmployeeOnboarding: () => setCompletionState(true),
    resetEmployeeOnboarding: () => setCompletionState(false),
    hasCompletedEmployeeOnboarding: getCompletionState(),
  }
}
