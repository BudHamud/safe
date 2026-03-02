# Troubleshooting Capacitor Notification Listener Background Issue

## Context
This project is an Ionic/Capacitor application using Next.js for the frontend (`gastos-app`). We are using the plugin `@posx/capacitor-notifications-listener` (v5.0.7) to intercept bank push notifications and parse them into financial transactions.

### The Problem
When the app is in the foreground, it successfully requests the `BIND_NOTIFICATION_LISTENER_SERVICE` permission, starts the service, and correctly intercepts notifications. 

However, the user reports two critical issues:
1. **Background Death**: If the user swipes the app away from the "Recent Apps" screen (force close), the Notification Listener service stops intercepting notifications.
2. **Permission "Revocation" / Sleep state**: When the user re-opens the app after force-closing it, the app behaves as if the permission was revoked. The user is forced to go back into the Android Settings, disable the Notification Access toggle, wait 10 seconds, and re-enable it for the listener to start working again.

### What we have tried so far
1. **Frontend Caching**: We enabled `cacheNotifications: true` in the plugin initialization (`useBankNotifications.ts`) and called `restoreCachedNotifications()` on app startup. This was intended to handle the case where the WebView dies but the Service stays alive.
2. **Native Patching**: We used `patch-package` to modify the Java code of the plugin (`NotificationsListenerPlugin.java`). 
   - We changed the `isListening()` method to query `Settings.Secure.getString(resolver, "enabled_notification_listeners")` instead of relying on a volatile boolean, so the JS layer accurately knows if the system permission is granted.
   - We added `android.service.notification.NotificationListenerService.requestRebind(componentName)` on plugin load (Android 7.0+) to force the OS to wake up the service if it was sleeping.
3. **Battery Optimization**: The user was instructed to set the app battery usage to "Unrestricted" and lock the app in the Recents menu.

Despite these changes, the issue persists. The service dies completely and fails to re-bind gracefully.

---

## Required Data for Debugging (For the User)

To solve this, we need to understand exactly what the Android OS is doing to the process when the app is swiped away.

**Please connect the phone via USB, enable USB Debugging, and run the following commands:**

### 1. Check System Permission Registry
Run this to confirm the OS hasn't silently wiped the permission:
```bash
adb shell settings get secure enabled_notification_listeners
```
*(We expect to see `com.gastoscajafuerte.app/com.capacitor.notifications.listener.NotificationService` in the output).*

### 2. Capture the Kill/Restart Cycle Logs
Run this command to filter specifically for the notification service and Capacitor:
```bash
adb logcat -s NotificationListenerService NotificationService NotificationsListenerPlugin Capacitor ActivityManager
```

**While the logger is running, do the following:**
1. Open the app (ensure the listener is active).
2. Swipe the app away from "Recent Apps" (force close it).
3. Wait 5 seconds.
4. Send a test notification (e.g., a bank transfer).
5. Re-open the app.

Copy the output of the terminal and provide it here.

---

## To the AI Assisting (Claude)

**Points to investigate based on the upcoming logs:**
1. **Is the service being destroyed?** Look for `onDestroy()` calls in the logs. Standard Android behavior is to kill the App process on swipe, which often brings down bound services.
2. **Is it a Bound vs. Started Service issue?** The plugin implements `NotificationListenerService` (which is started and bound by the OS, not the app). If the OS unbinds it when the app dies, how do we force the OS to keep it alive? Do we need to call `startForegroundService` with a persistent notification?
3. **OEM Aggressiveness**: Depending on the brand (Xiaomi, Samsung, etc.), the OS might be killing background services violently. Are there specific `AndroidManifest.xml` flags (like `android:stopWithTask="false"`) or foreground service requirements missing?
4. **Rebind Failure**: Why is the manual toggle required? If `requestRebind` failed to wake it up, why does toggling the system setting work? Is the service crashing silently in the background and entering a crash loop?
