import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { driver } from 'driver.js'

const STORAGE_KEY = 'onboarding_admin_completed'
const POPOVER_CLASS = 'admin-onboarding-popover'
const START_DELAY_MS = 320

const buildTourSteps = (t) => [
  {
    element: '[data-tour="dashboard-header"]',
    popover: {
      title: t('adminOnboarding.steps.dashboardHeader.title'),
      description: t('adminOnboarding.steps.dashboardHeader.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="menu-employees"]',
    popover: {
      title: t('adminOnboarding.steps.menuEmployees.title'),
      description: t('adminOnboarding.steps.menuEmployees.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-employee"]',
    popover: {
      title: t('adminOnboarding.steps.addEmployee.title'),
      description: t('adminOnboarding.steps.addEmployee.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="work-schedule"]',
    popover: {
      title: t('adminOnboarding.steps.workSchedule.title'),
      description: t('adminOnboarding.steps.workSchedule.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports"]',
    popover: {
      title: t('adminOnboarding.steps.reports.title'),
      description: t('adminOnboarding.steps.reports.description'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    popover: {
      title: t('adminOnboarding.steps.final.title'),
      description: t('adminOnboarding.steps.final.description'),
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

export function useAdminOnboarding({ enabled = false, autoStart = true } = {}) {
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
      nextBtnText: t('adminOnboarding.actions.next'),
      prevBtnText: t('adminOnboarding.actions.previous'),
      doneBtnText: t('adminOnboarding.actions.done'),
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

    window.restartAdminOnboarding = restart

    return () => {
      if (window.restartAdminOnboarding === restart) {
        delete window.restartAdminOnboarding
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
    startAdminOnboarding: start,
    restartAdminOnboarding: restart,
    completeAdminOnboarding: () => setCompletionState(true),
    resetAdminOnboarding: () => setCompletionState(false),
    hasCompletedAdminOnboarding: getCompletionState(),
  }
}
