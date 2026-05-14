/**
 * Monitoring Configuration - Sentry + Google Analytics
 * 
 * Usage in main.tsx:
 * import { initMonitoring, trackPageView, captureException } from './monitoring'
 * initMonitoring()
 * 
 * In components:
 * trackPageView('dashboard', { role: user.role })
 * captureException(error, { context: 'login' })
 */

let analyticsLoaded = false;
type AnalyticsProperties = Record<string, unknown>;
type Gtag = (...args: unknown[]) => void;
type SentryBridge = {
  captureException: (error: Error, options?: { tags?: Record<string, string>; extra?: AnalyticsProperties }) => void;
};

/**
 * Initialize Sentry error tracking and Google Analytics
 */
export function initMonitoring() {
  // Initialize Sentry (optional - requires @sentry/react)
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDSN && window.__SENTRY__) {
    console.log('✅ Sentry initialized');
  }

  // Initialize Google Analytics
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaMeasurementId && !analyticsLoaded) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    }
    gtag('js', new Date());
    gtag('config', gaMeasurementId, {
      page_path: window.location.pathname,
      anonymize_ip: true,
    });

    window.gtag = gtag;
    analyticsLoaded = true;
    console.log('✅ Google Analytics initialized');
  }
}

/**
 * Track page view in Google Analytics
 */
export function trackPageView(page: string, properties?: AnalyticsProperties) {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: page,
      page_path: window.location.pathname,
      ...properties,
    });
  }
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  if (window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
    });
  }
}

/**
 * Capture exception in Sentry
 */
export function captureException(error: Error, context?: AnalyticsProperties) {
  console.error('❌ Error captured:', error.message);
  
  if (window.__SENTRY__) {
    window.__SENTRY__.captureException(error, {
      tags: { context: String(context?.context || 'app') },
      extra: context,
    });
  }

  // Also track in Analytics
  trackEvent('error', {
    error_type: error.name,
    error_message: error.message,
    ...(context || {}),
  });
}

/**
 * Track login success/failure
 */
export function trackAuthEvent(status: 'success' | 'failure', details?: AnalyticsProperties) {
  trackEvent(status === 'success' ? 'login_success' : 'login_failure', {
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Declare global types for window object
 */
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    __SENTRY__?: SentryBridge;
  }
}

export {};
